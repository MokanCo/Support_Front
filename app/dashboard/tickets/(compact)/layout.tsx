/**
 * Tighter inset for the ticket queue and new-ticket flow only.
 * Ticket detail (`/dashboard/tickets/view`) is a sibling route and uses normal dashboard `main` padding.
 */
export default function TicketsCompactLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 -my-8 flex min-h-0 flex-1 flex-col lg:-mx-8">
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-4 py-8 lg:px-8">
        {children}
      </div>
    </div>
  );
}
