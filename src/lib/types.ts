export interface Domain {
  id: string
  domain: string
}

export interface MailAccount {
  id: string
  address: string
  password: string
  token: string
  createdAt: string
}

export interface Attachment {
  id: string
  filename: string
  contentType: string
  size: number
  downloadUrl: string
}

export interface MailMessage {
  id: string
  from: { address: string; name: string }
  to: { address: string; name: string }[]
  subject: string
  intro: string
  text?: string
  html?: string[]
  attachments: Attachment[]
  size: number
  createdAt: string
  updatedAt: string
  seen: boolean
}

export interface MessagesResponse {
  'hydra:member': MailMessage[]
  'hydra:totalItems': number
}
