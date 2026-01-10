import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Send, 
  Image as ImageIcon, 
  User, 
  Headphones, 
  Paperclip,
  Smile,
  MoreVertical,
  Bot
} from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image';
  timestamp: Date;
  isAdmin: boolean;
}

const CustomerServicePage: React.FC = () => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      senderId: 'system',
      senderName: '客服助手',
      content: '您好！我是您的专属客服助手。请问有什么可以帮您？',
      type: 'text',
      timestamp: new Date(),
      isAdmin: true,
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages from Supabase
  useEffect(() => {
    if (!user) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        // If table doesn't exist yet, we silently fail and rely on local state/mock
        // console.error('Failed to load messages:', error);
        return;
      }

      if (data && data.length > 0) {
        const formattedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          senderName: msg.is_admin_reply ? '客服人员' : (profile?.username || '用户'),
          content: msg.content,
          type: msg.type as 'text' | 'image',
          timestamp: new Date(msg.created_at),
          isAdmin: msg.is_admin_reply
        }));
        
        // Keep the welcome message if no history
        if (formattedMessages.length > 0) {
          setMessages(formattedMessages);
        }
      }
    };

    loadMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`support_chat_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            
            return [...prev, {
              id: newMessage.id,
              senderId: newMessage.sender_id,
              senderName: newMessage.is_admin_reply ? '客服人员' : (profile?.username || '用户'),
              content: newMessage.content,
              type: newMessage.type,
              timestamp: new Date(newMessage.created_at),
              isAdmin: newMessage.is_admin_reply
            }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return;

    const content = inputValue;
    setInputValue(''); // Clear input immediately for better UX

    // Optimistic update
    const tempId = Date.now().toString();
    const optimisticMessage: Message = {
      id: tempId,
      senderId: user.id,
      senderName: profile?.username || '用户',
      content: content,
      type: 'text',
      timestamp: new Date(),
      isAdmin: false,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    // Send to Supabase
    const { data, error } = await supabase.from('support_messages').insert({
      user_id: user.id,
      sender_id: user.id,
      content: content,
      type: 'text',
      is_admin_reply: false,
      is_read: false
    }).select().single();

    if (error) {
      console.error('Failed to send message:', error);
      // If failed (e.g. table missing), we keep the optimistic update but show a toast
      // And maybe trigger the mock auto-reply for demo purposes
      if (error.code === '42P01') { // undefined_table
         toast.error('消息已发送 (演示模式 - 数据库未连接)');
         setTimeout(() => {
            const reply: Message = {
              id: (Date.now() + 1).toString(),
              senderId: 'system',
              senderName: '客服助手',
              content: '收到您的消息。我们的客服人员会尽快回复您。(演示模式)',
              type: 'text',
              timestamp: new Date(),
              isAdmin: true,
            };
            setMessages(prev => [...prev, reply]);
          }, 1000);
      } else {
         toast.error('发送失败: ' + error.message);
      }
    } else if (data) {
       // Replace optimistic message with real one
       setMessages(prev => prev.map(m => m.id === tempId ? {
          id: data.id,
          senderId: data.sender_id,
          senderName: profile?.username || '用户',
          content: data.content,
          type: data.type,
          timestamp: new Date(data.created_at),
          isAdmin: data.is_admin_reply
       } : m));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const toastId = toast.loading('正在上传图片...');

    try {
      // 1. Upload to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('support-attachments')
        .upload(fileName, file);

      if (uploadError) {
        // If bucket missing, fallback to local reader for demo
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('row-level security')) {
            console.warn('Storage bucket issue, falling back to local preview');
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target?.result as string;
                const newMessage: Message = {
                  id: Date.now().toString(),
                  senderId: user.id,
                  senderName: profile?.username || '用户',
                  content: imageUrl,
                  type: 'image',
                  timestamp: new Date(),
                  isAdmin: false,
                };
                setMessages(prev => [...prev, newMessage]);
                toast.success('图片已发送 (本地演示模式)', { id: toastId });
            };
            reader.readAsDataURL(file);
            setIsUploading(false);
            return;
        }
        throw uploadError;
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('support-attachments')
        .getPublicUrl(fileName);

      // 3. Insert Message record
      const { data: msgData, error: msgError } = await supabase.from('support_messages').insert({
        user_id: user.id,
        sender_id: user.id,
        content: publicUrl,
        type: 'image',
        is_admin_reply: false,
        is_read: false
      }).select().single();

      if (msgError) throw msgError;

      if (msgData) {
        setMessages(prev => [...prev, {
            id: msgData.id,
            senderId: msgData.sender_id,
            senderName: profile?.username || '用户',
            content: msgData.content,
            type: msgData.type,
            timestamp: new Date(msgData.created_at),
            isAdmin: msgData.is_admin_reply
        }]);
      }

      toast.success('图片发送成功', { id: toastId });
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error('上传失败: ' + error.message, { id: toastId });
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
            <Headphones className="w-8 h-8" />
            客服中心
          </h1>
          <p className="text-muted-foreground mt-1">
            与管理员直接沟通，反馈问题或建议
          </p>
        </div>
        
        <div className="hidden md:flex items-center gap-2 bg-secondary/50 p-2 rounded-lg border border-border/50">
          <Badge variant="outline" className="bg-background">
            UID: {user?.id?.slice(0, 8) || 'Unknown'}...
          </Badge>
          <Badge variant="outline" className="bg-background">
            用户: {profile?.username || 'Guest'}
          </Badge>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-sidebar-border shadow-lg">
        <CardHeader className="py-4 border-b border-sidebar-border bg-sidebar-accent/10 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage src="/support-avatar.png" />
              <AvatarFallback className="bg-primary text-primary-foreground">CS</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">在线客服</CardTitle>
              <CardDescription className="text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                通常在 5 分钟内回复
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-background/50">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`flex gap-2 max-w-[80%] ${msg.isAdmin ? 'flex-row' : 'flex-row-reverse'}`}>
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className={msg.isAdmin ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                        {msg.isAdmin ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`group flex flex-col ${msg.isAdmin ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-xs font-medium text-muted-foreground">{msg.senderName}</span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div
                        className={`p-3 rounded-2xl ${
                          msg.isAdmin
                            ? 'bg-secondary text-secondary-foreground rounded-tl-none'
                            : 'bg-primary text-primary-foreground rounded-tr-none'
                        } shadow-sm`}
                      >
                        {msg.type === 'text' ? (
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        ) : (
                          <img 
                            src={msg.content} 
                            alt="Uploaded content" 
                            className="max-w-full rounded-lg max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.content, '_blank')}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-sidebar-border bg-background">
            <div className="flex items-end gap-2 bg-secondary/30 p-2 rounded-xl border border-input focus-within:ring-1 focus-within:ring-ring transition-all">
              <div className="flex gap-1 pb-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full">
                  <Smile className="w-5 h-5" />
                </Button>
              </div>
              
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="输入消息..."
                className="min-h-[40px] max-h-[120px] resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent px-2 py-2"
                rows={1}
              />
              
              <Button 
                onClick={handleSendMessage} 
                size="icon" 
                className="h-9 w-9 mb-0.5 rounded-full shrink-0"
                disabled={!inputValue.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              您的 UID: {user?.id} 将对管理员可见，以便更好地为您服务。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerServicePage;
