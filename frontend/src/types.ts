export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    type?: 'text' | 'tool';
}

export interface Recipe {
    title: string;
    ingredients: string[];
    steps: string[];
}

export interface CalendarEvent {
    id: string;
    subject: string;
    date: string;
    start_time?: string;
    end_time?: string;
    details?: string;
}
