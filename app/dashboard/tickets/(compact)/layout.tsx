/**
 * Tighter inset for the ticket queue and new-ticket flow only.
 * Ticket detail (`/dashboard/tickets/view`) is a sibling route and uses normal dashboard `main` padding.
 */
export default function TicketsCompactLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 -mt-6 -mb-6 flex min-h-0 flex-1 flex-col sm:-mx-6 lg:-mx-10 lg:-mt-8 lg:-mb-8">
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-2.5 pb-2.5 pt-2.5">
        {children}
      </div>
    </div>
  );
}
