import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';

type ReviewStatus = 'pending' | 'approved' | 'rejected';
type Submission = {
  id: string;
  user_id: string;
  type: 'community' | 'institution';
  addresses: string[];
  status: ReviewStatus;
};

const parseEnvNumber = (v: string | undefined, def: number) => {
  const n = v ? Number(v) : def;
  return Number.isFinite(n) ? n : def;
};

const chunk = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const handler = async (event: any) => {
  try {
    const {
      AIRDROP_RPC_URL,
      AIRDROP_PRIVATE_KEY,
      TOKEN_ADDRESS,
      TOKEN_DECIMALS,
      AIRDROP_AMOUNT_COMMUNITY,
      AIRDROP_AMOUNT_INSTITUTION,
      BATCH_SIZE,
      VITE_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    } = process.env as Record<string, string | undefined>;

    if (!AIRDROP_RPC_URL || !AIRDROP_PRIVATE_KEY || !TOKEN_ADDRESS || !VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: 'Missing required environment variables' }),
      };
    }

    const body = event?.body ? JSON.parse(event.body) : {};
    const submissionId: string | undefined = body?.submissionId;
    if (!submissionId) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'submissionId required' }) };
    }

    const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: submission, error: subErr } = await supabase
      .from('interaction_submissions')
      .select('id,user_id,type,addresses,status')
      .eq('id', submissionId)
      .single();
    if (subErr || !submission) {
      return { statusCode: 404, body: JSON.stringify({ ok: false, error: 'submission not found' }) };
    }
    if (submission.status !== 'approved') {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'submission not approved' }) };
    }

    const decimals = parseEnvNumber(TOKEN_DECIMALS, 18);
    const communityAmount = parseEnvNumber(AIRDROP_AMOUNT_COMMUNITY, 1);
    const institutionAmount = parseEnvNumber(AIRDROP_AMOUNT_INSTITUTION, 1);
    const batchSize = parseEnvNumber(BATCH_SIZE, 20);
    const unit = ethers.parseUnits('1', decimals);
    const amountEach =
      submission.type === 'community'
        ? unit * BigInt(communityAmount)
        : unit * BigInt(institutionAmount);

    const provider = new ethers.JsonRpcProvider(AIRDROP_RPC_URL);
    const wallet = new ethers.Wallet(AIRDROP_PRIVATE_KEY, provider);
    const erc20 = new ethers.Contract(
      TOKEN_ADDRESS,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      wallet
    );

    const addresses: string[] = Array.isArray(submission.addresses) ? submission.addresses : [];
    const valid = addresses.filter((a) => {
      try {
        return !!ethers.getAddress(a);
      } catch {
        return false;
      }
    });

    const groups = chunk(valid, batchSize);
    const results: { address: string; tx?: string; error?: string }[] = [];

    for (const g of groups) {
      const txs = g.map(async (addr) => {
        const { data: evtData } = await supabase
          .from('airdrop_events')
          .insert({
            submission_id: submission.id,
            address: addr,
            amount: Number(ethers.formatUnits(amountEach, decimals)),
            status: 'pending',
          })
          .select('id')
          .single();
        try {
          const tx = await erc20.transfer(addr, amountEach);
          const receipt = await tx.wait();
          await supabase
            .from('airdrop_events')
            .update({ status: 'sent', tx_hash: receipt?.hash || tx.hash })
            .eq('id', evtData?.id);
          results.push({ address: addr, tx: receipt?.hash || tx.hash });
        } catch (e: any) {
          await supabase
            .from('airdrop_events')
            .update({ status: 'failed', error: e?.message || 'unknown' })
            .eq('id', evtData?.id);
          results.push({ address: addr, error: e?.message || 'unknown' });
        }
      });
      await Promise.allSettled(txs);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        submissionId,
        processed: results.length,
        sent: results.filter((r) => r.tx).length,
        failed: results.filter((r) => r.error).length,
        results,
      }),
    };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e?.message || 'unknown error' }) };
  }
};
