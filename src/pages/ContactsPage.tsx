import { useState, useEffect } from 'react';
import { Users, Upload, Search, Trash2, Filter, MoreHorizontal, CheckCircle2, Clock, XCircle } from 'lucide-react';
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      toast.error('Please select a survey first');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const numbers = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      
      if (numbers.length === 0) {
        toast.error('No numbers found in file');
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
        toast.success(`Imported ${numbers.length} contacts`);
        fetchData();
      } catch (error) {
        toast.error('Failed to import contacts');
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = async (id: string) => {
    try {
      await blink.db.contacts.delete(id);
      toast.success('Contact removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove contact');
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
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Manage your call list and target numbers.</p>
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
              Upload CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search numbers..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedSurvey} onValueChange={setSelectedSurvey}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by Survey" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Surveys</SelectItem>
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
                <TableHead>Phone Number</TableHead>
                <TableHead>Survey</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
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
                    No contacts found.
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
                          <DropdownMenuItem>View Results</DropdownMenuItem>
                          <DropdownMenuItem>Retry Call</DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(contact.id)}
                          >
                            Delete
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
    </div>
  );
}
