import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

export const enum StatusbarAlignment {
  LEFT,
  RIGHT
}

export interface IStatusbarEntry {
  readonly id: string
  readonly name: string
  readonly text: string
  readonly ariaLabel?: string
  readonly tooltip?: string
  readonly command?: () => void
  readonly priority?: number
}

export interface IStatusbarEntryAccessor {
  update: (entry: Partial<Omit<IStatusbarEntry, 'id'>>) => void
  dispose: () => void
}

interface StoredEntry extends IStatusbarEntry {
  alignment: StatusbarAlignment
}

interface StatusbarContextType {
  entries: Map<string, StoredEntry>
  addEntry: (
    id: string,
    entry: Omit<IStatusbarEntry, 'id'>,
    alignment: StatusbarAlignment,
    priority?: number
  ) => IStatusbarEntryAccessor
}

const StatusbarContext = createContext<StatusbarContextType | undefined>(undefined)

export const StatusbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<Map<string, StoredEntry>>(new Map())
  const entriesRef = useRef(entries)

  const updateEntriesRef = useCallback((newEntries: Map<string, StoredEntry>) => {
    entriesRef.current = newEntries
    setEntries(newEntries)
  }, [])

  const addEntry = useCallback(
    (
      id: string,
      entry: Omit<IStatusbarEntry, 'id'>,
      alignment: StatusbarAlignment,
      priority?: number
    ): IStatusbarEntryAccessor => {
      // Create the entry
      const newEntry: StoredEntry = {
        id,
        name: entry.name,
        text: entry.text,
        ariaLabel: entry.ariaLabel,
        tooltip: entry.tooltip,
        command: entry.command,
        priority: priority ?? 0,
        alignment
      }

      // Add to entries
      const newEntries = new Map(entriesRef.current)
      newEntries.set(id, newEntry)
      updateEntriesRef(newEntries)

      const accessor: IStatusbarEntryAccessor = {
        update: (entryUpdate: Partial<Omit<IStatusbarEntry, 'id'>>) => {
          const current = entriesRef.current.get(id)
          if (current) {
            const updated = { ...current, ...entryUpdate }
            const updatedEntries = new Map(entriesRef.current)
            updatedEntries.set(id, updated)
            updateEntriesRef(updatedEntries)
          }
        },
        dispose: () => {
          const updatedEntries = new Map(entriesRef.current)
          updatedEntries.delete(id)
          updateEntriesRef(updatedEntries)
        }
      }

      return accessor
    },
    [updateEntriesRef]
  )

  return (
    <StatusbarContext.Provider value={{ entries, addEntry }}>{children}</StatusbarContext.Provider>
  )
}

export const useStatusbar = (): StatusbarContextType => {
  const context = useContext(StatusbarContext)
  if (!context) {
    throw new Error('useStatusbar must be used within a StatusbarProvider')
  }
  return context
}
