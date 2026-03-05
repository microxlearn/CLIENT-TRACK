'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating personalized WhatsApp messages for clients.
 *
 * - generateWhatsAppMessage - A function that generates a WhatsApp message based on client data and communication purpose.
 * - GenerateWhatsAppMessageInput - The input type for the generateWhatsAppMessage function.
 * - GenerateWhatsAppMessageOutput - The return type for the generateWhatsAppMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const GenerateWhatsAppMessageInputSchema = z.object({
  clientName: z.string().describe('The name of the client.'),
  clientMarket: z.enum(['INDIAN', 'FOREX', 'BROKER']).describe('The market the client is associated with.'),
  clientFee: z.number().describe('The fee associated with the client\'s service.'),
  clientExpiryDate: z.string().describe('The subscription expiry date of the client, in a human-readable format (e.g., "January 1, 2024").'),
  communicationPurpose: z.string().describe('The purpose of the WhatsApp message, e.g., "subscription nearing expiry", "pending payment", "general update".'),
});
export type GenerateWhatsAppMessageInput = z.infer<typeof GenerateWhatsAppMessageInputSchema>;

// Output Schema
const GenerateWhatsAppMessageOutputSchema = z.object({
  message: z.string().describe('The generated personalized WhatsApp message for the client.'),
});
export type GenerateWhatsAppMessageOutput = z.infer<typeof GenerateWhatsAppMessageOutputSchema>;

// Wrapper function to be called from the client
export async function generateWhatsAppMessage(input: GenerateWhatsAppMessageInput): Promise<GenerateWhatsAppMessageOutput> {
  return generateWhatsAppMessageFlow(input);
}

// Prompt definition
const whatsappMessagePrompt = ai.definePrompt({
  name: 'generateWhatsAppMessagePrompt',
  input: {schema: GenerateWhatsAppMessageInputSchema},
  output: {schema: GenerateWhatsAppMessageOutputSchema},
  prompt: `You are an AI assistant designed to generate personalized WhatsApp messages for clients.
Your goal is to create a friendly, professional, and clear message based on the provided client details and the communication purpose.
Ensure the message is concise and directly addresses the purpose.

Client Name: {{{clientName}}}
Client Market: {{{clientMarket}}}
Client Fee: {{{clientFee}}}
Client Subscription Expiry Date: {{{clientExpiryDate}}}
Communication Purpose: {{{communicationPurpose}}}

Examples of messages based on purpose:
- If 'subscription nearing expiry': "Hi {{{clientName}}}, your {{{clientMarket}}} subscription is due to expire on {{{clientExpiryDate}}}. Please renew soon to avoid service interruption. Thank you!"
- If 'pending payment': "Hi {{{clientName}}}, this is a friendly reminder regarding your pending payment of {{{clientFee}}} for your {{{clientMarket}}} service. Please make the payment at your earliest convenience. Thank you!"
- If 'general update': "Hi {{{clientName}}}, we have an important update regarding your {{{clientMarket}}} service. Please check our portal for more details. Thank you!"

Please generate a WhatsApp message for the client based on the communication purpose. The message should only contain the text of the message, without any prefixes or explanations.
`,
});

// Flow definition
const generateWhatsAppMessageFlow = ai.defineFlow(
  {
    name: 'generateWhatsAppMessageFlow',
    inputSchema: GenerateWhatsAppMessageInputSchema,
    outputSchema: GenerateWhatsAppMessageOutputSchema,
  },
  async (input) => {
    const {output} = await whatsappMessagePrompt(input);
    return output!;
  }
);
