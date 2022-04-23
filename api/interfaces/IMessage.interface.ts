
export interface IMessage {
    type?: 'coreTemp' | 'roomTemp' | 'both',
    line1: string,
    line2?: string
}
