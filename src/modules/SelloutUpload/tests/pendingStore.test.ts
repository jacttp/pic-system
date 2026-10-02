import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { selloutApi } from '../services/selloutApi'
import { useSelloutStore } from '../stores/selloutStore'
import type { SelloutPreviewData } from '../types/sellout'

vi.mock('../services/selloutApi', () => ({
  selloutApi: { createPendingStore: vi.fn(), preview: vi.fn(), commit: vi.fn(), history: vi.fn() },
}))

const storeData = { storeCode: '43014', storeName: '43014 SUPERCITO', rowCount: 10 }
const manifest = (previewToken: string): SelloutPreviewData => ({ period: { year: 2026, month: 10 }, previewToken, chains: [] })

beforeEach(() => {
  vi.resetAllMocks()
  setActivePinia(createPinia())
})

describe('Alta temporal Chedraui', () => {
  it('renueva el manifiesto después del alta y conserva el archivo sin confirmar sellout', async () => {
    const store = useSelloutStore()
    const file = { name: 'chedraui.xlsx' } as File
    store.setFile('CHEDRAUI', file)
    store.previewData = manifest('anterior')
    vi.mocked(selloutApi.createPendingStore).mockResolvedValue({ id: 1, codigo_sucursal: '43014', tienda: storeData.storeName, matriz: null })
    vi.mocked(selloutApi.preview).mockResolvedValue(manifest('renovado'))
    await store.registerPendingStore(storeData)
    expect(selloutApi.createPendingStore).toHaveBeenCalledWith(storeData)
    expect(store.previewData?.previewToken).toBe('renovado')
    expect(store.files.CHEDRAUI).toStrictEqual(file)
    expect(selloutApi.commit).not.toHaveBeenCalled()
    expect(store.isRegisteringStore).toBe(false)
  })

  it('bloquea dobles altas y la confirmación del sellout mientras registra', async () => {
    const store = useSelloutStore()
    store.setFile('CHEDRAUI', { name: 'chedraui.xlsx' } as File)
    store.previewData = manifest('anterior')
    let finish!: (value: { id: number; codigo_sucursal: string; tienda: string; matriz: null }) => void
    vi.mocked(selloutApi.createPendingStore).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    vi.mocked(selloutApi.preview).mockResolvedValue(manifest('renovado'))
    const pending = store.registerPendingStore(storeData)
    expect(store.canCommit).toBe(false)
    await store.registerPendingStore(storeData)
    await store.commit()
    expect(selloutApi.createPendingStore).toHaveBeenCalledTimes(1)
    expect(selloutApi.commit).not.toHaveBeenCalled()
    finish({ id: 1, codigo_sucursal: '43014', tienda: storeData.storeName, matriz: null })
    await pending
  })

  it('informa un alta ya persistida si falla el reanálisis y descarta el token anterior', async () => {
    const store = useSelloutStore()
    store.setFile('CHEDRAUI', { name: 'chedraui.xlsx' } as File)
    store.previewData = manifest('anterior')
    vi.mocked(selloutApi.createPendingStore).mockResolvedValue({ id: 1, codigo_sucursal: '43014', tienda: storeData.storeName, matriz: null })
    vi.mocked(selloutApi.preview).mockRejectedValue(new Error('Sin conexión'))
    await expect(store.registerPendingStore(storeData)).rejects.toThrow('Sin conexión')
    expect(store.error).toContain('quedó registrada')
    expect(store.previewData).toBeNull()
    expect(store.canCommit).toBe(false)
    expect(store.isRegisteringStore).toBe(false)
  })

  it('descarta el manifiesto si falla el alta para exigir nuevo análisis antes de reintentar', async () => {
    const store = useSelloutStore()
    store.previewData = manifest('anterior')
    vi.mocked(selloutApi.createPendingStore).mockRejectedValue(new Error('La sucursal ya existe'))
    await expect(store.registerPendingStore(storeData)).rejects.toThrow('ya existe')
    expect(store.previewData).toBeNull()
    expect(selloutApi.preview).not.toHaveBeenCalled()
    expect(store.error).toContain('ya existe')
  })

  it('compila los dos componentes Vue afectados sin ejecutar build ni navegador', () => {
    for (const relative of ['../components/SelloutPreview.vue', '../views/SelloutUploadView.vue']) {
      const source = readFileSync(new URL(relative, import.meta.url), 'utf8')
      const { descriptor, errors } = parse(source)
      expect(errors).toEqual([])
      const script = compileScript(descriptor, { id: relative })
      const template = compileTemplate({ source: descriptor.template!.content, filename: relative, id: relative, compilerOptions: { bindingMetadata: script.bindings } })
      expect(template.errors).toEqual([])
    }
  })
})
