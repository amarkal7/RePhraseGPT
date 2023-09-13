export type Settings = {
  model: string;
  style: string[];
  tone: string[];
  format: string;
  action: string;
  character: string[];
  //nonrand:string;
  //nonrand1:string;
  //nonrand2:string;
  //nonrand3:string;
  //nonrand4:string;
  //nonrand5:string;
  //nonrand6:string;
  //nonrand7:string;
  //nonrand8:string;
  //nonrand9:string;
  //nonrand10:string;
  //nonrand11:string;
  //nonrand12:string;
  //nonrand13:string;
  //nonrand14:string;
  maxTokens: number;
  temperature: number;
  apiKey: string;
};

export type ChatMessage = {
  role: string;
  content: string;
};
