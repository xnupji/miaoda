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

  // 复制一份用于无缝循环
  const doubledInvestors = [...investors, ...investors];

  return (
    <div className="mt-8">
      <Card className="glow-border overflow-hidden bg-gradient-to-br from-background via-accent/5 to-background">
        <CardContent className="py-4">
          <div className="space-y-3">
            {/* 标题部分 */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-lg font-bold gradient-text">战略投资方</h3>
              </div>
            </div>

            {/* 滚动容器 - 从左到右 */}
            <div className="relative overflow-hidden py-2">
              {/* 左侧渐变遮罩 */}
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10" />
              
              {/* 右侧渐变遮罩 */}
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10" />
              
              {/* 滚动内容 */}
              <div className="flex gap-2 animate-scroll-left">
                {doubledInvestors.map((investor, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-br from-accent/40 to-accent/20 border border-primary/20 hover:border-primary hover:shadow-md hover:shadow-primary/20 transition-all duration-300"
                  >
                    <span className="text-xs font-semibold whitespace-nowrap bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {investor}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 融资信息 */}
            <div className="text-center pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                总融资 <span className="font-bold text-primary">$30,000,000</span> · 2023年投入开发
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSS动画样式 */}
      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes scroll-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }

        .animate-scroll-left {
          animation: scroll-left 40s linear infinite;
        }

        .animate-scroll-right {
          animation: scroll-right 40s linear infinite;
        }

        .animate-scroll-left:hover,
        .animate-scroll-right:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
