export type TicketStatus = "booked" | "checked-in" | "cancelled";

export interface Ticket {
  id: string;
  passengerName: string;
  flightNumber: string;
  origin: string;
  destination: string;
  seatNumber: string;
  price: number;
  status: TicketStatus;
  createdAt?: string;
  updatedAt?: string;
}
