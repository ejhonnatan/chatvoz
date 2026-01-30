import { useState, useEffect } from 'react';
import { Users, Upload, Search, Trash2, Filter, MoreHorizontal, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { blink } from '../lib/blink';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from 'react-hot-toast';

interface Contact {
  id: string;
  surveyId: string;
  phoneNumber: string;
  status: 'pending' | 'called' | 'failed';
  createdAt: string;
}

interface Survey {
  id: string;
  name: string;
}

export function ContactsPage() {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewResult, setViewResult] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contactsData, surveysData] = await Promise.all([
        blink.db.contacts.list({ orderBy: { createdAt: 'desc' } }),
        blink.db.surveys.list({ select: ['id', 'name'] })
      ]);
      setContacts(contactsData as Contact[]);
      setSurveys(surveysData as Survey[]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (selectedSurvey === 'all') {
      toast.error(t('contacts.selectSurveyError'));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const numbers = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      
      if (numbers.length === 0) {
        toast.error(t('contacts.noNumbersError'));
        return;
      }

      const userId = (await blink.auth.me())?.id;
      if (!userId) return;

      const contactsToCreate = numbers.map(num => ({
        phoneNumber: num,
        surveyId: selectedSurvey,
        userId: userId,
        status: 'pending'
      }));

      try {
        await blink.db.contacts.createMany(contactsToCreate);
        toast.success(t('contacts.importSuccess', { count: numbers.length }));
        fetchData();
      } catch (error) {
        toast.error(t('contacts.importError'));
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = async (id: string) => {
    try {
      await blink.db.contacts.delete(id);
      toast.success(t('contacts.deleteSuccess'));
      fetchData();
    } catch (error) {
      toast.error(t('contacts.deleteError'));
    }
  };

  const handleViewResult = async (contactId: string) => {
    try {
      const results = await blink.db.surveyResults.list({
        where: { contact_id: contactId },
        limit: 1
      });
      if (results.length > 0) {
        setViewResult(results[0]);
      } else {
        toast.error('No results found for this contact');
      }
    } catch (error) {
      toast.error('Failed to load result');
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSurvey = selectedSurvey === 'all' || contact.surveyId === selectedSurvey;
    const matchesSearch = contact.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSurvey && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'called': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSurveyName = (id: string) => {
    return surveys.find(s => s.id === id)?.name || 'Unknown Survey';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('contacts.title')}</h1>
          <p className="text-muted-foreground">{t('contacts.subtitle')}</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <input
              type="file"
              id="csv-upload"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button variant="outline" className="gap-2" onClick={() => document.getElementById('csv-upload')?.click()}>
              <Upload className="h-4 w-4" />
              {t('contacts.uploadCsv')}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder={t('contacts.searchPlaceholder')} 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedSurvey} onValueChange={setSelectedSurvey}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t('contacts.filterBySurvey')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('contacts.allSurveys')}</SelectItem>
            {surveys.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('contacts.phoneNumber')}</TableHead>
                <TableHead>{t('common.surveys')}</TableHead>
                <TableHead>{t('contacts.status')}</TableHead>
                <TableHead>{t('contacts.added')}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-24 animate-pulse rounded bg-secondary" /></TableCell>
                    <TableCell><div className="h-4 w-32 animate-pulse rounded bg-secondary" /></TableCell>
                    <TableCell><div className="h-4 w-16 animate-pulse rounded bg-secondary" /></TableCell>
                    <TableCell><div className="h-4 w-20 animate-pulse rounded bg-secondary" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-muted-foreground">
                    {t('common.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-mono font-medium">{contact.phoneNumber}</TableCell>
                    <TableCell>{getSurveyName(contact.surveyId)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(contact.status)}
                        <span className="capitalize">{contact.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewResult(contact.id)} disabled={contact.status !== 'called'}>
                            {t('common.viewResults')}
                          </DropdownMenuItem>
                          <DropdownMenuItem>{t('common.retryCall')}</DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(contact.id)}
                          >
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
