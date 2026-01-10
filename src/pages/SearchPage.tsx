import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { Search as SearchIcon, Loader2, Database } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResult {
  id: string;
  type: 'user' | 'transaction';
  title: string;
  subtitle: string;
  details: any;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setResults([]);

    try {
      const searchResults: SearchResult[] = [];

      // 1. Search Users (Profiles)
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id, username, email, invitation_code, role')
        .or(`username.ilike.%${query}%,invitation_code.ilike.%${query}%`)
        .limit(5);

      if (!userError && users) {
        users.forEach(user => {
          searchResults.push({
            id: user.id,
            type: 'user',
            title: user.username || 'Unknown User',
            subtitle: `Code: ${user.invitation_code} | Role: ${user.role}`,
            details: user
          });
        });
      }

      // 2. Search Transactions (if query might be an ID or amount)
      // Only search own transactions for privacy, or all if admin?
      // For now, let's search user's own transactions
      if (profile?.id) {
        const { data: txs, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', profile.id)
          .or(`description.ilike.%${query}%,type.ilike.%${query}%`)
          .limit(5);

        if (!txError && txs) {
          txs.forEach(tx => {
            searchResults.push({
              id: tx.id,
              type: 'transaction',
              title: `${tx.type} - ${tx.amount} ${tx.token_type}`,
              subtitle: tx.description || tx.created_at,
              details: tx
            });
          });
        }
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6" />
          数据库搜索 (Database Search)
        </h1>
        <p className="text-muted-foreground">
          通过简写字母或关键词搜索数据库信息 (HTP / Usernames / Codes)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>快速搜索</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="输入关键词 (例如: HTP, admin, 邀请码...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
              搜索
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="grid gap-4">
          {results.map((result) => (
            <Card key={`${result.type}-${result.id}`} className="hover:bg-accent/5 transition-colors">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{result.title}</h3>
                    <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                    <div className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-20">
                      <pre>{JSON.stringify(result.details, null, 2)}</pre>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded capitalize">
                    {result.type}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results.length === 0 && query && !loading && (
        <div className="text-center text-muted-foreground py-8">
          未找到相关结果
        </div>
      )}
    </div>
  );
}
