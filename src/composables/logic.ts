import type { BlockState } from '~/types'

const directions = [
  [1, 1],
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
]

interface GameState {
  board: BlockState[][]
  mineGenerated: boolean
  gameState: 'play' | 'won' | 'lost'
  startMS: number

}

export class GamePlay {
  // 重构为ref 就可以使用useStorage
  state = ref() as Ref<GameState>

  constructor(
    public width: number,
    public height: number,
    public mines: number,
  ) {
    this.reset()
  }

  get board() {
    return this.state.value?.board
  }

  get blocks() {
    return this.state.value?.board.flat()
  }

  reset(
    width = this.width,
    height = this.height,
     mines = this.mines,
  ) {
    this.width = width
    this.height = height
    this.mines = mines
    this.state.value = {
      startMS: +Date.now(),
      mineGenerated: false,
      gameState: 'play',
      board: Array.from({ length: this.height }, (_, y) => Array.from(
        { length: this.width },
        (_, x): BlockState => ({
          x,
          y,
          adjacentMines: 0,
          revealed: false,
        }),
      )),
    }
  }

  random(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  randomInt(min: number, max: number) {
    return Math.round(this.random(min, max))
  }

  generateMines(state: BlockState[][], initial: BlockState) {
    const placeRandom = () => {
      const x = this.randomInt(0, this.width - 1)
      const y = this.randomInt(0, this.height - 1)
      const block = state[y][x]
      if (Math.abs(initial.x - block.x) < 1 && Math.abs(initial.y - block.y) < 1)
        return false
      if (block.mine)
        return false
      block.mine = true
      return true
    }

    Array.from({ length: this.mines }, () => null)
      .forEach(() => {
        let placed = false
        while (!placed)
          placed = placeRandom()
      })

    this.updateNumbers(state)
  }

  updateNumbers(state: BlockState[][]) {
    state.forEach((row: any[]) => {
      row.forEach((block: BlockState) => {
        if (block.mine)
          return
        this.getSiblings(block).forEach((b) => {
          if (b.mine)
            block.adjacentMines += 1
        })
      })
    })
  }

  getSiblings(block: BlockState) {
    return directions
      .map(([dx, dy]) => {
        const x2 = block.x + dx
        const y2 = block.y + dy
        if (x2 < 0 || x2 >= this.width || y2 < 0 || y2 >= this.height)
          return undefined

        return this.board[y2][x2]
      })
      .filter(Boolean) as BlockState[]
  }

  expandZero(block: BlockState) {
    if (block.adjacentMines)
      return

    this.getSiblings(block).forEach((s) => {
      if (!s.revealed) {
        s.revealed = true
        this.expandZero(s)
      }
    })
  }

  showAllMines() {
    this.board.flat().forEach((i) => {
      if (i.mine)
        i.revealed = true
    })
  }

  checkGameState() {
    if (!this.state.value.mineGenerated)
      return
    const blocks = this.board.flat()

    if (blocks.every(block => block.revealed || block.flagged)) {
      if (blocks.some(block => block.revealed && block.flagged)) {
        this.state.value.gameState = 'lost'
        this.showAllMines()
      }
      else {
        this.state.value.gameState = 'won'
      }
    }
  }

  onRightClick(block: BlockState) {
    if (this.state.value.gameState !== 'play')
      return
    if (block.revealed)
      return
    block.flagged = !block.flagged
  }

  onClick(block: BlockState) {
    if (this.state.value.gameState !== 'play')
      return

    if (!this.state.value.mineGenerated) {
      this.generateMines(this.board, block)
      this.state.value.mineGenerated = true
    }

    block.revealed = true
    if (block.mine) {
      this.state.value.gameState = 'lost'
      this.showAllMines()
      return
    }
    this.expandZero(block)
  }
}