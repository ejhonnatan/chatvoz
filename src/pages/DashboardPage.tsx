import { 
  BarChart3, 
  Users, 
  ClipboardList, 
  PhoneCall, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { blink } from '../lib/blink';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { cn } from '../lib/utils';

export function DashboardPage() {
  const { t } = useTranslation();
  const [counts, setCounts] = useState({ surveys: 0, contacts: 0, results: 0 });
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [viewResult, setViewResult] = useState<any | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [surveysCount, contactsCount, resultsCount, recent, activeSurveys] = await Promise.all([
          blink.db.surveys.count(),
          blink.db.contacts.count(),
          blink.db.surveyResults.count(),
          blink.db.surveyResults.list({ 
            limit: 5, 
            orderBy: { createdAt: 'desc' } 
          }),
          blink.db.surveys.list({
            where: { status: 'active' },
            limit: 3
          })
        ]);
        
        setCounts({ 
          surveys: Number(surveysCount), 
          contacts: Number(contactsCount), 
          results: Number(resultsCount) 
        });
        setRecentResults(recent as any[]);
        setActiveCampaigns(activeSurveys as any[]);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };
    
    fetchDashboardData();
  }, []);

  const stats = [
    { label: t('dashboard.totalSurveys'), value: counts.surveys.toString(), icon: ClipboardList, trend: '+2 this week', positive: true },
    { label: t('dashboard.activeContacts'), value: counts.contacts.toLocaleString(), icon: Users, trend: '+12% from last month', positive: true },
    { label: t('dashboard.callsMade'), value: counts.results.toLocaleString(), icon: PhoneCall, trend: '+24% from last month', positive: true },
    { label: t('dashboard.completionRate'), value: counts.contacts > 0 ? `${((counts.results / counts.contacts) * 100).toFixed(1)}%` : '0%', icon: BarChart3, trend: '-2.1% from last month', positive: false },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="mt-1 flex items-center gap-1 text-xs">
                  {stat.positive ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-destructive" />
                  )}
                  <span className={stat.positive ? "text-emerald-500" : "text-destructive"}>
                    {stat.trend}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentResults.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center italic">No activity yet.</p>
              ) : (
                recentResults.map((result) => (
                  <div key={result.id} className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t('dashboard.surveyCompleted')}</p>
                      <p className="text-xs text-muted-foreground">
                        Contact ID {result.contactId} • {new Date(result.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setViewResult(result)}>{t('common.view')}</Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t('dashboard.activeCampaigns')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeCampaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center italic">No active campaigns.</p>
              ) : (
                activeCampaigns.map((survey) => (
                  <div key={survey.id} className="flex flex-col gap-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{survey.name}</span>
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        {t('common.active')}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary">
                      <div className="h-full w-full rounded-full bg-primary" />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{survey.status}</span>
                      <span>100%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewResult} onOpenChange={(open) => !open && setViewResult(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Survey Result</DialogTitle>
            <DialogDescription>
              Transcript and analysis for contact result.
            </DialogDescription>
          </DialogHeader>
          {viewResult && (
            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sentiment</p>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-bold uppercase",
                    viewResult.sentiment === 'positive' ? "bg-emerald-100 text-emerald-800" : 
                    viewResult.sentiment === 'negative' ? "bg-rose-100 text-rose-800" : 
                    "bg-zinc-100 text-zinc-800"
                  )}>
                    {viewResult.sentiment}
                  </span>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Date</p>
                  <p className="text-xs font-mono">{new Date(viewResult.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Summary</p>
                <div className="rounded-lg bg-secondary/50 p-3 text-sm italic">
                  {viewResult.summary}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Full Transcript</p>
                <div className="rounded-lg border p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                  {viewResult.transcript}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}