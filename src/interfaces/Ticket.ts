export type TicketStatus = "booked" | "checked-in" | "cancelled";

export interface Ticket {
  id: string;
  passengerName: string;
}
