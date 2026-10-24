import { AddIcon, MinusIcon } from '@chakra-ui/icons'
import { Badge, Flex, Icon, IconButton, Text } from '@chakra-ui/react'
import { useEffect } from 'react'
import useChordTransposer from '../hooks/useChordTransposer'
import { HiArrowsUpDown } from 'react-icons/hi2'
import { UGChordCollection } from '../types/tabs'
interface ChordTransposerProps {
  chords: UGChordCollection[]
  setChords: Function
  amount: number
  setAmount: (amount: number) => void
}
export default function ChordTransposer({
  chords,
  setChords,
  amount,
  setAmount,
}: ChordTransposerProps): JSX.Element {
  const { data: chordsTransposed } = useChordTransposer(Object.keys(chords))
  useEffect(() => {
    if (chordsTransposed) {
      setChords(chordsTransposed)
    }
  }, [chordsTransposed, setChords])

  return (
    <Flex display={'flex'} fontSize={'sm'} alignItems={'center'}>
      <Text color={'gray.500'} as="b" mr={1}>
        {' '}
        Transpose{' '}
      </Text>
      <Icon boxSize={5} as={HiArrowsUpDown} mr={1} />
      <IconButton
        variant="outline"
        _hover={{
          bg: 'blue.400',
          color: 'white',
        }}
        size={'sm'}
        boxShadow="md"
        fontWeight={'normal'}
        px="3"
        py="4"
        onClick={() => setAmount(amount - 1)}
        aria-label="Transpose down"
        icon={<MinusIcon />}
      />
      <Badge mx={2} variant="subtle" fontSize={'sm'} color={'blue.400'}>
        {amount}
      </Badge>
      <IconButton
        variant="outline"
        _hover={{
          bg: 'blue.400',
          color: 'white',
        }}
        size={'sm'}
        boxShadow="md"
        fontWeight={'normal'}
        px="3"
        py="4"
        onClick={() => setAmount(amount + 1)}
        aria-label="Transpose up"
        icon={<AddIcon />}
      />
    </Flex>
  )
}
