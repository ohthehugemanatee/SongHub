import { IconButton, Tooltip, useDisclosure, useToast } from '@chakra-ui/react'
import { FiPlus } from 'react-icons/fi'
import { Tab } from '../types/tabs'
import { tabForSave } from '../lib/core/transpose'
import DatePickerModal, { getLastSelectedDate, setLastSelectedDate } from './DatePickerModal'
import { useState, useEffect } from 'react'

interface Props {
  tab: Tab
  transpose: number
  isLoading: boolean
}

export default function SetlistAddButton({ tab, transpose, isLoading }: Props): JSX.Element {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  const [lastDate, setLastDate] = useState<string | null>(null)

  useEffect(() => {
    setLastDate(getLastSelectedDate())
  }, [isOpen])

  const handleDateSelect = async (date: string) => {
    if (!tab) return
    setLastSelectedDate(date)
    setLastDate(date)

    // First, save the tab locally if it's from Ultimate Guitar (not already saved)
    if (tab.url && !tab.url.startsWith('local://')) {
      try {
        const tabToSave = tabForSave(tab, transpose)

        await fetch('/api/saved-tabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tab: tabToSave }),
        })
      } catch (e) {
        console.error('Failed to save tab:', e)
      }
    }

    // Construct filename from tab info
    const filename = `${tab.artist} - ${tab.name} (${tab.type || 'Chords'}).ultimatetab.json`

    await fetch('/api/setlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        filename,
        artist: tab.artist,
        name: tab.name,
        type: tab.type || 'Chords',
      }),
    })
    
    toast({
      description: `"${tab.name}" zur Setlist hinzugefügt`,
      status: 'success',
      position: 'top-right',
      duration: 2000,
    })
    
    // Notify setlist view to refresh
    window.dispatchEvent(new Event('setlist-updated'))
  }

  return (
    <>
      <Tooltip label="Zur Setlist hinzufügen" placement="top">
        <IconButton
          aria-label="Zur Setlist hinzufügen"
          icon={<FiPlus />}
          variant="outline"
          size="sm"
          boxShadow="md"
          colorScheme="green"
          isDisabled={isLoading || !tab}
          onClick={onOpen}
        />
      </Tooltip>
      <DatePickerModal
        isOpen={isOpen}
        onClose={onClose}
        onDateSelect={handleDateSelect}
        selectedDate={lastDate}
      />
    </>
  )
}
