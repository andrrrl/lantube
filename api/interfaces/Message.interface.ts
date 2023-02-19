
export interface Message {
    type?: 'coreTemp' | 'roomTemp' | 'both',
    line1: string,
    line2?: string
}
