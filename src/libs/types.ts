export type TwimlXmlString = string & { __brand: 'TwimlXmlString' };

export function asTwimlXmlString(xml: string): TwimlXmlString {
  // no validations here for now to avoid bloated checks and slow down code.
  return xml as TwimlXmlString;
}
