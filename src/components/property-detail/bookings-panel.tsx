import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export function BookingsPanel({
  taxLabel,
  bookings,
}: {
  taxLabel: string;
  bookings: Array<{
    id: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    platform: string;
    source: string;
    grossAmount: number | null;
    crossesBoundary: boolean;
  }>;
}) {
  function fmtDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
  }

  function fmtMoney(cents: number | null): string {
    if (!cents) return "—";
    return (cents / 100).toLocaleString("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    });
  }

  if (bookings.length === 0) {
    return <p className="text-sm text-subtle-foreground">No bookings yet. Connect your calendar to start syncing.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Check-in</TableHead>
          <TableHead>Check-out</TableHead>
          <TableHead>Nights</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead>{taxLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.id}>
            <TableCell className="font-mono text-sm">{fmtDate(booking.checkIn)}</TableCell>
            <TableCell className="font-mono text-sm">{fmtDate(booking.checkOut)}</TableCell>
            <TableCell className="text-sm font-semibold tabular-nums">{booking.nights}</TableCell>
            <TableCell className="capitalize text-sm">{booking.platform}</TableCell>
            <TableCell className="text-sm">{booking.source}</TableCell>
            <TableCell className="text-right font-mono text-sm tabular-nums">
              {fmtMoney(booking.grossAmount)}
            </TableCell>
            <TableCell>
              {booking.crossesBoundary && (
                <Badge variant="warning" className="text-xs">
                  Split
                </Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
