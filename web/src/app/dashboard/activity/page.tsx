'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export default function ActivityHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();
    const fetchAll = async () => {
      const userId = user.id;
      // Fetch calls
      const { data: calls, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      // Fetch emails
      const { data: emails, error: emailsError } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      // Fetch sms_messages
      const { data: sms, error: smsError } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      // Combine and sort
      let all: any[] = [];
      if (calls) all = all.concat(calls.map((c: any) => ({ ...c, _type: 'Call' })));
      if (emails) all = all.concat(emails.map((e: any) => ({ ...e, _type: 'Email' })));
      if (sms) all = all.concat(sms.map((s: any) => ({ ...s, _type: 'Text' })));
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setActivities(all);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <p className="text-black">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4 bg-transparent">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-graffiti text-4xl md:text-6xl font-bold text-black mb-10 text-center">
          Communication History
        </h1>
        <div className="bg-white/80 border-2 border-black rounded-2xl shadow-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-black">
            <thead>
              <tr className="bg-white">
                <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider border-b-2 border-black">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider border-b-2 border-black">Recipient</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider border-b-2 border-black">Date/Time</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider border-b-2 border-black">Summary</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider border-b-2 border-black">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white/60 divide-y divide-black">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-black/60">No history found.</td>
                </tr>
              ) : (
                activities.map((item) => (
                  <tr key={item.id + item._type} className="hover:bg-black/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-black">{item._type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-black">{item._type === 'Email' ? item.recipient_email : item._type === 'Call' ? item.phone_number : item.phone_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-black">{formatDate(item.created_at)}</td>
                    <td className="px-6 py-4 text-black">{item._type === 'Email' ? item.subject : item._type === 'Call' ? item.topic : item.message || ''}</td>
                    <td className="px-6 py-4 text-black font-semibold">{item.status || ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 