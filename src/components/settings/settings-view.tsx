'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Moon, Sun, Trash } from 'lucide-react';
import { useMemoFirebase } from '@/firebase/provider';
import { format } from 'date-fns';
import { useTheme } from '@/components/theme-provider';
import { RecycleBinView } from './recycle-bin-view';

type TemplateVariable = '{{name}}' | '{{market}}' | '{{fee}}' | '{{expiry_date}}';

const variables: TemplateVariable[] = ['{{name}}', '{{market}}', '{{fee}}', '{{expiry_date}}'];

export default function SettingsView() {
  const [template, setTemplate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'whatsapp_template') : null, [firestore]);
  const { data: settingsData, isLoading: isLoadingSettings } = useDoc(settingsRef);

  useEffect(() => {
    if (settingsData && settingsData.whatsappTemplate) {
      setTemplate(settingsData.whatsappTemplate);
    }
  }, [settingsData]);

  const addVariable = (variable: TemplateVariable) => {
    setTemplate(prev => prev + ` ${variable} `);
  };
  
  const handleSave = async () => {
    if(!firestore || !settingsRef) return;
    setIsLoading(true);
    try {
        if (settingsData) {
            updateDocumentNonBlocking(settingsRef, { whatsappTemplate: template });
        } else {
            await setDoc(settingsRef, { whatsappTemplate: template, id: 'whatsapp_template' });
        }
        toast({ title: 'Success', description: 'Template saved successfully.' });
    } catch (error) {
        console.error(error);
        toast({ title: 'Error', description: 'Could not save template.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const previewMessage = template
    .replace('{{name}}', 'John Doe')
    .replace('{{market}}', 'FOREX')
    .replace('{{fee}}', '900')
    .replace('{{expiry_date}}', format(new Date(), 'PPP'));

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        Settings
      </h2>

      <div className="max-w-3xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex items-center space-x-2">
                    <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}>
                        <Sun className="mr-2 h-4 w-4" /> Light
                    </Button>
                    <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}>
                        <Moon className="mr-2 h-4 w-4" /> Dark
                    </Button>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recycle Bin</CardTitle>
            <CardDescription>
              Manage clients that have been deleted from the payments list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">View and permanently delete or restore clients.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="ml-auto" onClick={() => setIsRecycleBinOpen(true)}>
              <Trash className="mr-2 h-4 w-4" /> Open Recycle Bin
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Message Template</CardTitle>
            <CardDescription>Customize the message sent to clients. Use variables to personalize it.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSettings ? <div className="flex justify-center"><LoaderCircle className="animate-spin" /></div> : (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="template-editor">Template Editor</Label>
                    <Textarea 
                      id="template-editor"
                      value={template} 
                      onChange={(e) => setTemplate(e.target.value)} 
                      rows={8} 
                      placeholder="e.g. Hi {{name}}, your subscription is expiring on {{expiry_date}}."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Insert Variable</Label>
                    <div className="flex flex-wrap gap-2">
                      {variables.map(v => (
                        <Button key={v} variant="outline" size="sm" onClick={() => addVariable(v)}>{v}</Button>
                      ))}
                    </div>
                  </div>
                </div>
                 <div className="space-y-2">
                  <Label>Live Preview</Label>
                  <div className="rounded-md border bg-muted p-4 text-sm whitespace-pre-wrap h-full">{previewMessage}</div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
             <Button onClick={handleSave} disabled={isLoading || isLoadingSettings} className="ml-auto">
                {isLoading && <LoaderCircle className="animate-spin mr-2"/>}
                Save Template
            </Button>
          </CardFooter>
        </Card>
      </div>
      <RecycleBinView isOpen={isRecycleBinOpen} setIsOpen={setIsRecycleBinOpen} />
    </div>
  );
}
