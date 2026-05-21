import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ASSISTANT_ID = 'SmartStaffAssistant';
const PROMPTS = [
  { label: 'ניסוח הודעה להורים', icon: '📧', description: 'עזור לי לנסח הודעה מקצועית' },
  { label: 'סיכום אירוע', icon: '📋', description: 'סכם אירוע או דיסציפלינה' },
  { label: 'הצעת משימות טיפול', icon: '🎯', description: 'הצע משימות טיפול הולמות' },
  { label: 'סיכום שיחה', icon: '💬', description: 'סכם שיחה עם הורה' },
];

export default function SmartAssistantWidget({ user, studentId, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const handleOpenConversation = async () => {
    if (!conversationId) {
      try {
        setLoading(true);
        const conv = await base44.agents.createConversation({
          agent_name: ASSISTANT_ID,
          metadata: {
            name: 'סיוע צוות',
            description: studentId ? `עוזר עבור תלמיד: ${studentId}` : 'עוזר צוות כללי',
          }
        });
        setConversationId(conv.id);
        setMessages([{
          role: 'assistant',
          content: 'שלום! 👋 אני כאן כדי לעזור לך. בחר משימה או תאר לי בקצרה מה אתה צריך.'
        }]);
        setIsOpen(true);
      } catch (error) {
        toast.error('שגיאה בפתיחת שיחה');
      } finally {
        setLoading(false);
      }
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleSendMessage = async (text) => {
    if (!conversationId || !text.trim()) return;

    setLoading(true);
    const userMessage = {
      role: 'user',
      content: text,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const conv = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conv, userMessage);

      // Subscribe to updates
      const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
        setMessages(data.messages || []);
      });

      return () => unsubscribe();
    } catch (error) {
      toast.error('שגיאה בשליחת ההודעה');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    const text = `${prompt.label}: ${prompt.description}`;
    handleSendMessage(text);
  };

  const handleCopyMessage = (index) => {
    const message = messages[index];
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(index);
      setTimeout(() => setCopied(null), 2000);
      toast.success('הועתק');
    }
  };

  if (!user || !['admin', 'homeroom_teacher', 'coordinator'].includes(user.role)) {
    return null;
  }

  return (
    <div className={cn('w-full', className)}>
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle className="text-sm">עוזר צוות חכם</CardTitle>
            </div>
            <Button
              onClick={handleOpenConversation}
              disabled={loading}
              size="sm"
              variant={isOpen ? 'default' : 'outline'}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isOpen ? 'סגור' : 'פתח'}
            </Button>
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent className="space-y-4">
            {/* Messages */}
            <div className="bg-background/50 rounded-lg p-3 h-64 overflow-y-auto space-y-3 text-sm">
              {messages.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">
                  <p className="text-xs">בחר משימה או כתוב בקשה</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={cn(
                    'flex gap-2 group',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}>
                    <div className={cn(
                      'max-w-xs px-3 py-2 rounded-lg whitespace-pre-wrap break-words',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {msg.content}
                    </div>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopyMessage(idx)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copied === idx ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quick Prompts */}
            <div className="grid grid-cols-2 gap-2">
              {PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={loading}
                  className="text-left p-2.5 rounded-lg bg-card hover:bg-accent border border-border/50 hover:border-primary/50 transition-all disabled:opacity-50 text-xs"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg leading-none mt-0.5">{prompt.icon}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{prompt.label}</div>
                      <div className="text-[11px] text-muted-foreground leading-tight">{prompt.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(input);
                  }
                }}
                disabled={loading}
                placeholder="כתוב בקשה..."
                className="text-sm resize-none h-20"
              />
              <Button
                onClick={() => handleSendMessage(input)}
                disabled={loading || !input.trim()}
                className="self-end"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שלח'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}