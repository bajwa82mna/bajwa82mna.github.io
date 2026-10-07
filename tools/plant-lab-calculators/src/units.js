export const PREFIX={p:1e-12,n:1e-9,u:1e-6,'µ':1e-6,m:1e-3,'':1,k:1e3};
export function positive(value,name='Value',allowZero=false){const n=Number(value);if(!Number.isFinite(n)||(allowZero?n<0:n<=0))throw new RangeError(`${name} must be ${allowZero?'zero or ':''}positive and finite.`);return n}
export function toBase(value,prefix=''){if(!(prefix in PREFIX))throw new RangeError('Unsupported SI prefix.');return positive(value)*PREFIX[prefix]}
export function sig(value,digits=4){if(!Number.isFinite(value))return '—';return Number(value).toPrecision(digits).replace(/\.0+(?=e|$)/,'').replace(/(\.\d*?)0+(?=e|$)/,'$1')}
