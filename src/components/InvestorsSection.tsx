import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function InvestorsSection() {
  const investors = [
    'a16z',
    'Eden Block',
    'Galaxy Digital',
    'AMAVEN11',
    'Maven11',
    'CoinFund',
    'Protocol Labs',
    'Jsquare',
    'M31 Capital',
    'Peer VC',
    '币安 (Binance)',
    'OKX',
    'Gate.io',
  ];

  return (
    <div className="mt-12 space-y-6">
      <Card className="glow-border">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold gradient-text">投资方</h2>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 py-4">
              {investors.map((investor, index) => (
                <div
                  key={index}
                  className="px-4 py-2 rounded-lg bg-accent/30 border border-border hover:border-primary transition-colors"
                >
                  <span className="text-sm font-medium">{investor}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-lg font-semibold text-primary">
                总融资金额：<span className="text-2xl">$30,000,000</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                2023年投入开发
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
