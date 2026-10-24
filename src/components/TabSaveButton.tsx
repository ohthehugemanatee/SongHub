import { Button, Icon, Tooltip, useToast } from '@chakra-ui/react'
import { FiSave } from 'react-icons/fi'
import { Tab } from '../types/tabs'
import { useState } from 'react'

interface TabSaveButtonProps {
  tab: Tab
  transpose: number
  isLoading: boolean
}

export default function TabSaveButton({ tab, transpose, isLoading }: TabSaveButtonProps): JSX.Element {
  const toast = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!tab) return
    setIsSaving(true)
    try {
      const tabToSave: Tab = { ...tab, transpose }

      const res = await fetch('/api/saved-tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: tabToSave }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({
          description: `"${tab.name}" auf dem Server gespeichert!`,
          status: 'success',
          position: 'top-right',
          duration: 2000,
        })
      } else {
        throw new Error(data.error)
      }
    } catch (e) {
      toast({
        description: 'Speichern fehlgeschlagen.',
        status: 'error',
        position: 'top-right',
        duration: 2000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Tooltip label="Tab auf Server speichern" placement="top">
      <Button
        variant="outline"
        size="sm"
        boxShadow="md"
        fontWeight="normal"
        px="3"
        py="4"
        isDisabled={isLoading || !tab}
        isLoading={isSaving}
        onClick={handleSave}
        leftIcon={<Icon as={FiSave} />}
      >
        Speichern
      </Button>
    </Tooltip>
  )
}
