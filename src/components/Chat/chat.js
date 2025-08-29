'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import io from 'socket.io-client';
import {
  Card, CardContent, TextField, Button, Typography, Divider,
} from '@mui/material';

let socket; // module-level (or manage inside component)

export default function ChatRoom() {
  const { conversationId } = useParams();
  const [loading, setLoading] = useState(true);
  const [canteenName, setCanteenName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [messages, setMessages] = useState([]);
  const [mineId, setMineId] = useState(null);   // current actor id (customer or manager)
  const [mineType, setMineType] = useState(null); // 'user' | 'manager'
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  // identify current actor from localStorage + token convention used in your app
  useEffect(() => {
    // customer login stored: userId
    const uid = localStorage.getItem('userId');
    if (uid) {
      setMineId(uid);
      setMineType('user');
    } else {
      // if you store managerId similarly for manager app
      const mid = localStorage.getItem('managerId');
      if (mid) {
        setMineId(mid);
        setMineType('manager');
      }
    }
  }, []);

  // fetch conversation + messages, then connect socket
  useEffect(() => {
    if (!conversationId) return;

    const load = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/chat/${conversationId}/messages`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.message || 'Failed to load chat');
          return;
        }
        setCanteenName(data.canteenName || 'Canteen');
        setManagerName(data.managerName || 'Manager');
        setMessages(data.messages || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();

    // socket setup
    socket = io('http://localhost:5000', { withCredentials: true });
    socket.emit('join', { conversationId });

    socket.on('message', (msg) => {
      // new message pushed
      setMessages(prev => [...prev, msg]);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    return () => {
      socket?.disconnect();
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      const res = await fetch(`http://localhost:5000/api/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to send');
        return;
      }
      setText('');
      // no need to push locally; server will emit back via socket
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading chat…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
      <Card className="w-full max-w-3xl shadow-xl">
        {/* Header */}
        <div className="bg-[#6F4E37] text-white p-4 rounded-t-lg">
          <Typography variant="h6" className="font-semibold">
            {canteenName}
          </Typography>
          <Typography variant="body2" className="opacity-90">
            Manager: {managerName}
          </Typography>
        </div>

        <Divider />

        {/* Messages */}
        <CardContent className="bg-white h-[60vh] overflow-y-auto">
          {messages.map((m) => {
            const isMine =
              (mineType === 'user' && m.senderType === 'user') ||
              (mineType === 'manager' && m.senderType === 'manager');

            return (
              <div
                key={m._id}
                className={`w-full flex mb-2 ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-3 py-2 rounded-2xl ${
                    isMine ? 'bg-[#FF4081] text-white rounded-br-none' : 'bg-gray-200 text-black rounded-bl-none'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>
                  <div className={`text-[10px] mt-1 ${isMine ? 'text-white/80' : 'text-gray-600'}`}>
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </CardContent>

        <Divider />

        {/* Composer */}
        <div className="p-3 flex gap-2 items-center">
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            sx={{ backgroundColor: '#FF4081', textTransform: 'none' }}
          >
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}
