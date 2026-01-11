import { 
  Bot, 
  Headphones, 
  Image as ImageIcon, 
  MoreVertical,
  Paperclip,
  Send, 
  Smile,
  User,
  Search,
  MessageSquare
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image';
  timestamp: Date;
  isAdmin: boolean;
}

interface Conversation {
  userId: string;
  username: string;
  lastMessage: string;
  lastTimestamp: Date;
  unreadCount: number;
}

const CustomerServicePage: React.FC = () => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Admin State
  // Fallback: Check username 'admin' in case role update hasn't propagated or failed
  const isAdmin = profile?.role === 'admin' || profile?.username === 'admin';
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedUserId]);

  // Load Admin Conversations
  useEffect(() => {
    if (!isAdmin) return;

    const fetchConversations = async () => {
      console.log('Fetching conversations for admin...');
      // Fetch all messages to construct conversation list
      const { data, error } = await supabase
        .from('support_messages')
        .select(`
          *,
          profiles:user_id (
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }
      
      console.log('Raw messages fetched:', data?.length);

      const convMap = new Map<string, Conversation>();
      
      data?.forEach((msg: any) => {
        if (!convMap.has(msg.user_id)) {
          convMap.set(msg.user_id, {
            userId: msg.user_id,
            username: msg.profiles?.username || '未知用户',
            lastMessage: msg.type === 'image' ? '[图片]' : msg.content,
            lastTimestamp: new Date(msg.created_at),
            unreadCount: 0 
          });
        }
        
        // Count unread: if message is NOT from admin (is_admin_reply = false) AND not read
        const isFromUser = !msg.is_admin_reply;
        if (isFromUser && !msg.is_read) {
           const conv = convMap.get(msg.user_id);
           if (conv) conv.unreadCount += 1;
        }
      });

      setConversations(Array.from(convMap.values()));
    };

    fetchConversations();
    
    // Polling interval for robustness (every 5 seconds)
    const intervalId = setInterval(fetchConversations, 5000);

    // Subscribe to all new messages for admin
    const channel = supabase
      .channel('admin_support_list')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to ALL events (INSERT, UPDATE)
          schema: 'public',
          table: 'support_messages',
        },
        async (payload) => {
          fetchConversations(); // Simply re-fetch to be safe and consistent
        }
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  // Load Messages (for User OR Admin's selected user)
  useEffect(() => {
    if (!user) return;

    // Determine whose messages to load
    // If admin, load selectedUserId. If user, load user.id.
    const targetUserId = isAdmin ? selectedUserId : user.id;

    if (!targetUserId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to load messages:', error);
        return;
      }

      if (data) {
        const formattedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          senderName: msg.is_admin_reply ? '客服人员' : '用户', // Simplify name logic
          content: msg.content,
          type: msg.type as 'text' | 'image',
          timestamp: new Date(msg.created_at),
          isAdmin: msg.is_admin_reply
        }));
        
        // Add welcome message if empty and NOT admin view (admins don't need fake welcome)
        if (formattedMessages.length === 0 && !isAdmin) {
          setMessages([{
            id: 'welcome',
            senderId: 'system',
            senderName: '客服助手',
            content: '您好！我是您的专属客服助手。请问有什么可以帮您？',
            type: 'text',
            timestamp: new Date(),
            isAdmin: true,
          }]);
        } else {
          setMessages(formattedMessages);
        }
      }
    };

    loadMessages();

    // Subscribe to real-time updates for THIS conversation
    const channel = supabase
      .channel(`support_chat_${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `user_id=eq.${targetUserId}`,
        },
        (payload) => {
          const newMessage = payload.new;
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, {
              id: newMessage.id,
              senderId: newMessage.sender_id,
              senderName: newMessage.is_admin_reply ? '客服人员' : '用户',
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
  }, [user, isAdmin, selectedUserId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return;
    
    // Target user: if admin, sending to selectedUser. If user, sending to self (as user_id)
    const targetUserId = isAdmin ? selectedUserId : user.id;
    if (!targetUserId) return;

    const content = inputValue;
    setInputValue('');

    // Optimistic update
    const tempId = Date.now().toString();
    const optimisticMessage: Message = {
      id: tempId,
      senderId: user.id,
      senderName: isAdmin ? '客服人员' : (profile?.username || '用户'),
      content: content,
      type: 'text',
      timestamp: new Date(),
      isAdmin: isAdmin,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    // Send to Supabase
    const { data, error } = await supabase.from('support_messages').insert({
      user_id: targetUserId, // The conversation owner
      sender_id: user.id,    // The actual sender
      content: content,
      type: 'text',
      is_admin_reply: isAdmin,
      is_read: false
    }).select().single();

    if (error) {
      console.error('Failed to send message:', error);
      toast.error('发送失败: ' + error.message);
    } else if (data) {
       // Replace optimistic message
       setMessages(prev => prev.map(m => m.id === tempId ? {
          ...m,
          id: data.id,
          timestamp: new Date(data.created_at)
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
    const targetUserId = isAdmin ? selectedUserId : user?.id;
    
    if (!file || !user || !targetUserId) return;

    setIsUploading(true);
    const toastId = toast.loading('正在上传图片...');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `support/${targetUserId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('support-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('support-attachments')
        .getPublicUrl(fileName);

      const { data: msgData, error: msgError } = await supabase.from('support_messages').insert({
        user_id: targetUserId,
        sender_id: user.id,
        content: publicUrl,
        type: 'image',
        is_admin_reply: isAdmin,
        is_read: false
      }).select().single();

      if (msgError) throw msgError;

      if (msgData) {
        // No optimistic update needed for image, just wait for real one or rely on subscription
        // But for better UX, we can add it manually if subscription is slow
        // (Subscription handles it mostly)
      }

      toast.success('图片发送成功', { id: toastId });
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error('上传失败: ' + error.message, { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c => 
    c.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
            <Headphones className="w-8 h-8" />
            客服中心
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? '回复用户咨询，处理反馈' : '与管理员直接沟通，反馈问题或建议'}
          </p>
        </div>
        
        {!isAdmin && (
          <div className="hidden md:flex items-center gap-2 bg-secondary/50 p-2 rounded-lg border border-border/50">
            <Badge variant="outline" className="bg-background">
              UID: {user?.id?.slice(0, 8) || 'Unknown'}...
            </Badge>
            <Badge variant="outline" className="bg-background">
              用户: {profile?.username || 'Guest'}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Admin Sidebar - User List */}
        {isAdmin && (
          <Card className="w-80 flex flex-col border-sidebar-border shadow-lg">
             <CardHeader className="py-3 px-4 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="搜索用户..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
             </CardHeader>
             <CardContent className="flex-1 p-0 overflow-hidden bg-background/50">
               <ScrollArea className="h-full">
                 <div className="flex flex-col">
                   {filteredConversations.length === 0 ? (
                     <div className="p-4 text-center text-muted-foreground text-sm">
                       暂无会话
                     </div>
                   ) : (
                     filteredConversations.map(conv => (
                       <button
                         key={conv.userId}
                         onClick={() => setSelectedUserId(conv.userId)}
                         className={cn(
                           "flex items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50 border-b border-border/50",
                           selectedUserId === conv.userId && "bg-accent"
                         )}
                       >
                         <Avatar className="h-10 w-10">
                            <AvatarFallback>{conv.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium truncate">{conv.username}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">
                                  {conv.lastTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {conv.unreadCount > 0 && (
                                  <span className="flex h-2 w-2 rounded-full bg-red-500" />
                                )}
                              </div>
                            </div>
                            <p className={cn(
                              "text-xs truncate",
                              conv.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                            )}>
                              {conv.lastMessage}
                            </p>
                          </div>
                        </button>
                      ))
                   )}
                 </div>
               </ScrollArea>
             </CardContent>
          </Card>
        )}

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden border-sidebar-border shadow-lg">
          <CardHeader className="py-4 border-b border-sidebar-border bg-sidebar-accent/10 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                {isAdmin ? (
                   <AvatarFallback>{selectedUserId ? 'U' : 'CS'}</AvatarFallback>
                ) : (
                   <>
                    <AvatarImage src="/support-avatar.png" />
                    <AvatarFallback className="bg-primary text-primary-foreground">CS</AvatarFallback>
                   </>
                )}
              </Avatar>
              <div>
                <CardTitle className="text-base">
                  {isAdmin ? (
                    selectedUserId ? 
                      conversations.find(c => c.userId === selectedUserId)?.username || '用户' 
                      : '请选择一个会话'
                  ) : '在线客服'}
                </CardTitle>
                <CardDescription className="text-xs flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isAdmin && !selectedUserId ? 'bg-gray-400' : 'bg-green-500 animate-pulse'}`} />
                  {isAdmin ? (selectedUserId ? '在线' : '等待选择') : '通常在 5 分钟内回复'}
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-background/50">
            {isAdmin && !selectedUserId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                <p>请从左侧选择一个用户开始回复</p>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarFallback className={isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                                {msg.isAdmin ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className="flex items-center gap-2 mb-1 px-1">
                                <span className="text-xs font-medium text-muted-foreground">{msg.senderName}</span>
                                <span className="text-[10px] text-muted-foreground/60">
                                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              
                              <div
                                className={`p-3 rounded-2xl ${
                                  isMe
                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                    : 'bg-secondary text-secondary-foreground rounded-tl-none'
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
                      );
                    })}
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
                  {!isAdmin && (
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      您的 UID: {user?.id} 将对管理员可见，以便更好地为您服务。
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerServicePage;
