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
    <div className="mt-12 space-y-6">
      <Card className="glow-border overflow-hidden bg-gradient-to-br from-background via-accent/5 to-background">
        <CardContent className="pt-6 pb-8">
          <div className="space-y-6">
            {/* 标题部分 */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-3">
                <div className="p-2 rounded-full bg-primary/10 animate-pulse">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-bold gradient-text">战略投资方</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                获得全球顶级投资机构的信任与支持
              </p>
            </div>

            {/* 滚动容器 - 从左到右 */}
            <div className="relative overflow-hidden py-4">
              {/* 左侧渐变遮罩 */}
              <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
              
              {/* 右侧渐变遮罩 */}
              <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
              
              {/* 滚动内容 */}
              <div className="flex gap-4 animate-scroll-left">
                {doubledInvestors.map((investor, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 px-6 py-3 rounded-xl bg-gradient-to-br from-accent/40 to-accent/20 border border-primary/20 hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:scale-105"
                  >
                    <span className="text-base font-semibold whitespace-nowrap bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {investor}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 滚动容器 - 从右到左 */}
            <div className="relative overflow-hidden py-4">
              {/* 左侧渐变遮罩 */}
              <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
              
              {/* 右侧渐变遮罩 */}
              <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
              
              {/* 滚动内容 */}
              <div className="flex gap-4 animate-scroll-right">
                {doubledInvestors.map((investor, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 px-6 py-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 hover:border-primary hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
                  >
                    <span className="text-base font-semibold whitespace-nowrap text-primary">
                      {investor}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 融资信息 */}
            <div className="pt-6 border-t border-border/50">
              <div className="text-center space-y-3">
                <div className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border border-primary/30">
                  <p className="text-lg font-semibold">
                    <span className="text-muted-foreground">总融资金额：</span>
                    <span className="text-3xl font-bold gradient-text ml-2">$30,000,000</span>
                  </p>
                </div>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                  2023年投入开发
                  <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                </p>
              </div>
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
