import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import AgentMessageBubble from '@/components/agents/AgentMessageBubble';
import { Bot, Loader2, MessageSquarePlus, SendHorizontal } from 'lucide-react';

const AGENT_NAME = 'school_support_agent';

export default function SchoolSupportAgent() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const startConversation = async () => {
    setLoading(true);
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: 'תמיכה כללית', description: 'שיחת תמיכה כללית עם נתוני בית הספר' }
    });
    setConversation(conv);
    setMessages([{ role: 'assistant', content: 'שלום, אני סוכן התמיכה הכללי של המערכת. איך אפשר לעזור?' }]);
    setLoading(false);
  };

  useEffect(() => {
    const loadConversation = async () => {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      const existing = list?.[0];
      if (!existing) {
        await startConversation();
        return;
      }
      const full = await base44.agents.getConversation(existing.id);
      setConversation(full);
      setMessages(full.messages?.length ? full.messages : [{ role: 'assistant', content: 'שלום, אני סוכן התמיכה הכללי של המערכת. איך אפשר לעזור?' }]);
      setLoading(false);
    };
    loadConversation();
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, data => setMessages(data.messages || []));
    return () => unsubscribe?.();
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !conversation || sending) return;
    setSending(true);
    setInput('');
    const current = await base44.agents.getConversation(conversation.id);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    await base44.agents.addMessage(current, { role: 'user', content: text });
    setSending(false);
  };

  return (
    <div className="min-h-full bg-background p-4 pb-24 text-right" dir="rtl">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex items-center justify-start gap-3 text-right">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 text-right">
            <h1 className="text-xl font-bold text-foreground">סוכן תמיכה כללי</h1>
            <p className="text-sm text-muted-foreground">שיחה עם נתוני בית הספר והרשאות המשתמש</p>
          </div>
        </div>

        <Card className="flex h-[calc(100svh-210px)] min-h-[430px] flex-col overflow-hidden border-border bg-card text-right">
          <div className="flex-1 overflow-y-auto p-4" dir="rtl">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="ml-2 h-5 w-5 animate-spin" /> טוען שיחה...
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => <AgentMessageBubble key={index} message={message} />)}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="border-t border-border bg-background/70 p-3" dir="rtl">
            <div className="flex items-end justify-start gap-2">
              <Button onClick={sendMessage} disabled={!input.trim() || sending || loading} className="h-11 shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                שלח
              </Button>
              <Textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="כתוב שאלה או בקשת תמיכה..."
                className="min-h-[44px] max-h-32 resize-none text-right"
                dir="rtl"
              />
              <Button variant="outline" onClick={startConversation} disabled={loading || sending} className="hidden h-11 shrink-0 sm:inline-flex">
                <MessageSquarePlus className="h-4 w-4" /> חדשה
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}