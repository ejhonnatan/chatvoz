import { useState, useEffect } from 'react';
import { Plus, ClipboardList, MoreVertical, Play, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { blink } from '../lib/blink';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'react-hot-toast';

interface Survey {
  id: string;
  name: string;
  systemPrompt: string;
  status: string;
  createdAt: string;
}

export function SurveysPage() {
  const { t } = useTranslation();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const data = await blink.db.surveys.list({
        orderBy: { createdAt: 'desc' }
      }) as any[];
      setSurveys(data);
    } catch (error) {
      console.error('Failed to fetch surveys:', error);
      toast.error(t('common.loadingError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName || !newPrompt) {
      toast.error(t('surveys.fillAllFieldsError'));
      return;
    }

    try {
      await blink.db.surveys.create({
        name: newName,
        systemPrompt: newPrompt,
        userId: (await blink.auth.me())?.id,
        status: 'draft'
      });
      toast.success(t('surveys.createSuccess'));
      setIsCreateOpen(false);
      setNewName('');
      setNewPrompt('');
      fetchSurveys();
    } catch (error) {
      console.error('Failed to create survey:', error);
      toast.error(t('surveys.createError'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('surveys.deleteConfirm'))) return;
    try {
      await blink.db.surveys.delete(id);
      toast.success(t('surveys.deleteSuccess'));
      fetchSurveys();
    } catch (error) {
      toast.error(t('surveys.deleteError'));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('surveys.title')}</h1>
          <p className="text-muted-foreground">{t('surveys.subtitle')}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('surveys.newSurvey')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>{t('surveys.createTitle')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('surveys.nameLabel')}</Label>
                <Input 
                  id="name" 
                  placeholder={t('surveys.namePlaceholder')} 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prompt">{t('surveys.promptLabel')}</Label>
                <Textarea 
                  id="prompt" 
                  placeholder={t('surveys.promptPlaceholder')} 
                  className="h-48"
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleCreate}>{t('common.create')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-secondary/50" />
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : surveys.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center">
          <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-medium">{t('surveys.noSurveys')}</h3>
          <p className="mb-4 text-sm text-muted-foreground">{t('surveys.noSurveysSub')}</p>
          <Button variant="outline" onClick={() => setIsCreateOpen(true)}>{t('surveys.newSurvey')}</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <Card key={survey.id} className="group overflow-hidden transition-all hover:border-primary/50">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{survey.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(survey.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    survey.status === 'active' ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-800"
                  )}>
                    {survey.status === 'active' ? t('common.active') : t('common.draft')}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {survey.systemPrompt}
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                      <Play className="h-3 w-3" />
                      Run
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                      <Edit className="h-3 w-3" />
                      {t('common.edit')}
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleDelete(survey.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
