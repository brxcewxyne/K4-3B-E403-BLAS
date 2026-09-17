type Props = { size?: number };
const Icon = ({ children, size = 16 }: Props & { children: React.ReactNode }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
export const FileIcon = (props: Props) => <Icon {...props}><path d="M6 3h7l5 5v13H6zM13 3v5h5M9 13h6M9 16h5" /></Icon>;
export const PlusIcon = (props: Props) => <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>;
export const SendIcon = (props: Props) => <Icon {...props}><path d="m5 12 14-7-5.5 14-2.2-5.3zM11.3 13.7 19 5" /></Icon>;
export const CheckIcon = (props: Props) => <Icon {...props}><path d="m5 12.5 4 4L19 7" /></Icon>;
export const CloseIcon = (props: Props) => <Icon {...props}><path d="m6 6 12 12M18 6 6 18" /></Icon>;
export const UploadIcon = (props: Props) => <Icon {...props}><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5M5 15v5h14v-5" /></Icon>;
