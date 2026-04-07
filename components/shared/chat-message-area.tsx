"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Send, Paperclip, ImageIcon, MoreVertical } from "lucide-react";

interface ChatMessageAreaProps {
  channel: {
    id: string;
    title: string;
    counterpart: string;
    requiredAnswer: string;
  };
}

const sampleMessages = [
  {
    id: 1,
    sender: "Student",
    text: "I know the formula for current split, but I want the intuition in plain language.",
    time: "10:30 AM",
    isMe: true,
  },
  {
    id: 2,
    sender: "Teacher",
    text: "Imagine charge choosing between roads. Lower resistance is the wider road, so more current moves there in the same time.",
    time: "10:32 AM",
    isMe: false,
  },
  {
    id: 3,
    sender: "Student",
    text: "That makes sense. Could you also relate it to voltage staying the same across each branch?",
    time: "10:33 AM",
    isMe: true,
  },
  {
    id: 4,
    sender: "Teacher",
    text: "Yes. Because each branch sees the same voltage, current only changes according to how hard each path resists that shared push.",
    time: "10:35 AM",
    isMe: false,
  },
];

export function ChatMessageArea({ channel }: ChatMessageAreaProps) {
  const [messages, setMessages] = useState(sampleMessages);
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim()) return;
    setMessages([
      ...messages,
      {
        id: Date.now(),
        sender: "Me",
        text: inputValue,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
      }
    ]);
    setInputValue("");
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Chat Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarFallback>{channel.counterpart.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{channel.counterpart}</span>
            <span className="truncate text-xs text-muted-foreground sm:max-w-[300px]">{channel.title}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Timer and requirement badges */}
           <div className="hidden flex-col items-end sm:flex">
             <div className="flex items-center gap-1 text-sm font-medium text-foreground">
               <Clock className="h-4 w-4" /> 18m left
             </div>
             <div className="text-xs text-muted-foreground">Required: {channel.requiredAnswer}</div>
           </div>
           
           <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
             <MoreVertical className="h-5 w-5" />
           </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="flex flex-col space-y-6">
          <div className="mx-auto rounded-lg border border-dashed border-border bg-background px-4 py-3 text-center text-sm text-muted-foreground shadow-sm">
            <p className="font-medium text-foreground">Channel opened</p>
            Timer started. {channel.counterpart} has 18 minutes to provide a {channel.requiredAnswer} answer.
          </div>
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${msg.isMe ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex w-max max-w-[85%] flex-col gap-1 sm:max-w-[70%] ${msg.isMe ? "items-end" : "items-start"}`}>
                {!msg.isMe && (
                   <span className="ml-1 text-xs font-medium text-muted-foreground">{msg.sender}</span>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.isMe
                      ? "rounded-br-sm bg-foreground text-background"
                      : "rounded-bl-sm border border-border bg-muted/20 text-foreground"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-muted-foreground">{msg.time}</span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <div className="relative flex items-end gap-2 rounded-xl border border-border bg-muted/10 p-2 transition-colors focus-within:border-foreground/50">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground" aria-label="Attach file">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground" aria-label="Attach image">
            <ImageIcon className="h-4 w-4" />
          </Button>
          
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }}
            placeholder="Write a message..."
            className="min-h-9 flex-1 border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
          />
          
          <Button 
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="h-9 w-9 shrink-0 rounded-lg transition-all disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
