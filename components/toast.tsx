import { CheckIcon } from "./icons";
export function Toast({ message }: { message: string }) { return message ? <div className="toast" role="status"><span><CheckIcon size={12} /></span>{message}</div> : null; }
