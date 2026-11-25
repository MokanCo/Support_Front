"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataTableShell, EmptyRow, FilterField, PageIntro, fieldClass } from "@/components/ai-receptionist/ui";
import { formatWhen } from "@/lib/queries/receptionist";
import {
  fetchSmsConversation,
  fetchSmsMessages,
  fetchSmsOverview,
  markSmsRead,
  otherParty,
  type SmsMessage,
} from "@/lib/queries/sms";
import { retainSharedSocket, subscribeSmsInbound } from "@/lib/socket-client";

const COLUMNS = ["From", "Preview", "Received", "Status"];

export function SmsInboxPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "received">("all");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const markedIds = useRef(new Set<string>());

  const overview = useQuery({
    queryKey: ["ai-receptionist", "sms", "overview"],
    queryFn: fetchSmsOverview,
    refetchInterval: 20000,
  });
  const list = useQuery({
    queryKey: ["ai-receptionist", "sms", "messages", { page, search, status }],
    queryFn: () => fetchSmsMessages({ page, search, status }),
    refetchInterval: 20000,
  });
  const conversation = useQuery({
    queryKey: ["ai-receptionist", "sms", "conversation", selectedPhone],
    queryFn: () => fetchSmsConversation(selectedPhone as string),
    enabled: Boolean(selectedPhone),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => markSmsRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "sms"] });
    },
  });

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    const release = retainSharedSocket();
    const unsubscribe = subscribeSmsInbound((payload) => {
      const message = (payload as { message?: SmsMessage })?.message;
      if (!message) return;
      setNotice(`New SMS from ${message.fromNumber}`);
      void queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "sms"] });
    });
    return () => {
      unsubscribe();
      release();
    };
  }, [queryClient]);

  useEffect(() => {
    const unread = (conversation.data?.messages ?? []).filter((message) => message.status === "received");
    for (const message of unread) {
      if (markedIds.current.has(message.id)) continue;
      markedIds.current.add(message.id);
      markRead.mutate(message.id);
    }
  }, [conversation.data, markRead]);

  const rows = list.data?.messages ?? [];

  return (
    <div>
      <PageIntro
        title="SMS Inbox"
        description="Messages sent to the Bandwidth number are stored here. Opening a conversation marks it read. No reply is sent."
      />
      {notice ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900">
          <span>{notice}</span>
          <button type="button" className="font-medium" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </div>
      ) : null}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Count label="Total received SMS" value={overview.data?.totalInbound} />
        <Count label="Unread SMS" value={overview.data?.unread} />
        <Count label="Messages received today" value={overview.data?.today} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.85fr)]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Inbox"
            description={list.data ? `${list.data.total} messages` : "Stored messages"}
          />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FilterField label="Phone number">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={fieldClass}
                  placeholder="+15556667777"
                />
              </FilterField>
              <FilterField label="Messages">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as "all" | "received")}
                  className={fieldClass}
                >
                  <option value="all">All</option>
                  <option value="received">Unread</option>
                </select>
              </FilterField>
            </div>
            {list.isError ? <p className="text-sm text-red-600">{(list.error as Error).message}</p> : null}
            <DataTableShell columns={COLUMNS}>
              {list.isLoading ? (
                <EmptyRow colSpan={4} message="Loading messages…" />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={4} message="No SMS messages are stored yet." />
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedPhone(otherParty(row))}
                    className={`cursor-pointer border-b border-slate-100 ${
                      selectedPhone === otherParty(row) ? "bg-primary-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      <span className="inline-flex items-center gap-2">
                        {row.status === "received" ? (
                          <span className="h-2 w-2 rounded-full bg-primary-600" aria-label="Unread" />
                        ) : null}
                        {row.fromNumber}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                      {row.messageText || (row.mediaUrls.length ? "Attachment" : "—")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatWhen(row.receivedAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{row.status === "received" ? "Unread" : "Read"}</td>
                  </tr>
                ))
              )}
            </DataTableShell>
            <div className="flex justify-end gap-2 text-sm">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                Previous
              </Button>
              <span className="px-2 py-1.5">
                {page} / {list.data?.totalPages ?? 1}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= (list.data?.totalPages ?? 1)}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </CardBody>
        </Card>
        <Conversation
          phone={selectedPhone}
          messages={conversation.data?.messages ?? []}
          loading={conversation.isLoading}
        />
      </div>
    </div>
  );
}

function Count({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value ?? "—"}</div>
    </div>
  );
}

function Conversation({
  phone,
  messages,
  loading,
}: {
  phone: string | null;
  messages: SmsMessage[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader title="Conversation" description={phone ?? "Select a message."} />
      <CardBody className="space-y-3">
        {loading ? <p className="text-sm text-slate-500">Loading conversation…</p> : null}
        {!phone && !loading ? <p className="text-sm text-slate-500">No conversation is selected.</p> : null}
        {phone && !loading && messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages are stored for this number.</p>
        ) : null}
        <div className="space-y-3">
          {messages.map((message) => {
            const incoming = message.direction === "inbound";
            return (
              <div key={message.id} className={`flex ${incoming ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    incoming ? "bg-slate-100 text-slate-800" : "bg-primary-700 text-white"
                  }`}
                >
                  <p className="text-xs opacity-70">
                    {message.fromNumber} to {message.toNumber}
                  </p>
                  {message.messageText ? <p className="mt-1 whitespace-pre-wrap">{message.messageText}</p> : null}
                  {message.mediaUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block underline"
                    >
                      Attachment
                    </a>
                  ))}
                  <p className="mt-1 text-xs opacity-70">{formatWhen(message.receivedAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
