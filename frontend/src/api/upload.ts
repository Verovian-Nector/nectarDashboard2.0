import { api } from './client'

export async function uploadFiles(files: File[]): Promise<string[]> {
  const form = new FormData()
  for (const f of files) {
    form.append('files', f)
  }
  const { data } = await api.post<{ urls: string[] }>('/upload', form)
  return data.urls || []
}