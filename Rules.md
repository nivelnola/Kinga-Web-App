# Kinga
_Rules by Bronis Levin_
This is a card game for three or four players, originating from the USSR or perhaps earlier. It is a trick-taking game, consisting of multiple rounds with different contracts/scoring conditions. 

## General Rules
In the following examples, we consider a three-player game between Albert, Bob, and Charlie; modifications for a four-player game will be detailed in a separate section. The players sit in alphabetical order, and play proceeds clockwise (A --> B --> C --> A).

A standard deck of cards is used, trimmed to remove all cards from 2 through 6 and jokers. The deck therefore contains 32 cards, leaving 7 through Ace (high) - eight cards per suit.

### Dealing
Each round begins with the dealer handing out cards, two at a time. At any point in the dealing (other than the first or last go-arounds), two cards are dealt into the stock (прикуп). Once all cards are dealt, each player should have ten cards in their hand. The next player after the dealer reveals the cards in the stock, adds them to his hand, then removes two cards from his hand and places them into the discard stock without revealing them. This player begins play with the first hand. In the following round, the dealer roles shifts clockwise. 

__Example:__
> Albert deals the first hand: each player receives ten cards, and two cards go to the stock. Bob, seated after the dealer, reveals the stock and adds both cards to his hand, then discards two cards face-down; he now can lead the first trick. In the next round, the dealer role passes to Bob, and Charlie (now seated after the dealer) takes the stock and leads the trick.

### Playing a Trick
The first card played in a trick determines the suit of the trick. All other players must play the same suit; if a player does not have the suit in his hand, he can generally play any other card. The highest card in the suit of the trick takes the whole trick. The player who takes the trick places it face down in front of him, and then begins the next trick.

Note that by playing a suit other than the suit of the trick, you will not take the trick.

### Accounting Notes
Each round's total value is divided between the players, allowing for easy accounting. Furthermore, the game as a whole is a zero-sum game across the rounds: the final round is worth the negated sum of all previous rounds' points.

Once all eight rounds are played, all scores are summed per player, and the winner is whoever has the most points. 

## Rounds and Scoring

### Round 1: All Tricks
| Total | Count | Value |
|:-----:|:-----:|:-----:|
|  -40  |   10  |  -4   |

Standard rules apply. Each trick that is taken results in points.

### Round 2: Hearts
| Total | Count | Value |
|:-----:|:-----:|:-----:|
|  -40  |   8   |  -5   |

Hearts cannot be placed down into the discard stock. Hearts cannot be played as the first card (main suit) unless the player has no other suits in hand to play. Each Heart card that is taken results in points.

### Round 3: Jacks (Lads)
| Total | Count | Value |
|:-----:|:-----:|:-----:|
|  -40  |   4   |  -10  |

Jacks cannot be placed down into the discard stock. Each Jack that is taken results in points.

### Round 4: Queens (Ladies)
| Total | Count | Value |
|:-----:|:-----:|:-----:|
|  -40  |   4   |  -10  |

Queens cannot be placed down into the discard stock. Each Queen that is taken results in points.

### Round 5: Last Two Tricks
| Total | Count | Value |
|:-----:|:-----:|:-----:|
|  -40  |   2   |  -20  |

Standard rules apply. The last two tricks that are taken result in points.

### Round 6: King of Hearts (The Kinga)
| Total | Count | Value |
|:-----:|:-----:|:-----:|
|  -40  |   1   |  -40  |

The King of Hearts (also known as the Kinga) cannot be placed down into the discard stock. Hearts cannot be played as the first card (main suit) unless the player has no other suits in hand to play. If a player holds the Kinga and does not have a matching suit, he must play the Kinga. Only the Kinga is worth points. 

### Round 7: Negative Melee 
| Total | Type       | Count | Cost |
|:-----:|------------|:-----:|:----:|
|  -40  | All Tricks |   10  |  -4  |
|  -40  | Hearts     |    8  |  -5  |
|  -40  | Lads       |    4  |  -10 |
|  -40  | Ladies     |    4  |  -10 |
|  -40  | Last Two   |    2  |  -20 |
|  -40  | Kinga      |    1  |  -40 |
|-------|------------|-------|------|
|  -240 | ALL RULES  |       |      |

All rules and trick points from Rounds 1-6 apply, with one exception: the forced-play rule for the Kinga (if a player holds the Kinga and cannot follow suit, he must play it) applies only in Round 6, not here. Careful accounting is necessary!

__Example:__
> Albert, Bob, and Charlie play a 10-trick hand. Every trick is worth -4 to whoever takes it (All Tricks), on top of any other categories it triggers. The last two tricks (#9 and #10) carry an additional -20 penalty each, on top of everything else they trigger.
> * Trick 3, taken by Albert, contains the Jack of Spades and Queen of Clubs: -4 (All Tricks) + -10 (Lads) + -10 (Ladies) = -24 to Albert.
> * Trick 9, taken by Charlie, contains the 7 of Hearts, and is one of the last two tricks: -4 (All Tricks) + -5 (Hearts) + -20 (Last Two) = -29 to Charlie.
> * Trick 10, taken by Bob, contains the King of Hearts, and is the final trick: -4 (All Tricks) + -5 (Hearts) + -40 (Kinga) + -20 (Last Two) = -69 to Bob. _[Note the King of Hearts is scored twice on the same trick - once as a heart, once as the Kinga - because each category applies independently.]_

In table form:
| Trick | Taken By | Contents                       | All Tricks | Hearts | Lads | Ladies | Last Two | Kinga | Trick Total |
|:-----:|:--------:|-------------------------------:|:----------:|:------:|:----:|:------:|:--------:|:-----:|:-----------:|
|   3   |  Albert  | Jack of Spades, Queen of Clubs |    -4      |        | -10  |  -10   |          |       |    -24      |
|   9   |  Charlie | 7 of Hearts                    |    -4      |   -5   |      |        |   -20    |       |    -29      |
|   10  |   Bob    | King of Hearts                 |    -4      |   -5   |      |        |   -20    |  -40  |    -69      |



### Round 8: Positive Melee 
| Total | Type       | Count | Cost |
|:-----:|------------|:-----:|:----:|
|  +80  | All Tricks |   10  |  +8  |
|  +80  | Hearts     |    8  |  +10 |
|  +80  | Lads       |    4  |  +20 |
|  +80  | Ladies     |    4  |  +20 |
|  +80  | Last Two   |    2  |  +40 |
|  +80  | Kinga      |    1  |  +80 |
|-------|------------|-------|------|
|  +480 | ALL RULES  |       |      |

All rules and trick points from Rounds 1-6 apply, except now worth double and positive (the Kinga forced-play exception from Round 7 still holds: it is not forced here either). Each player has an opportunity to reverse his fortunes! 

## Extending to Four Players
When playing with four players, the following changes apply:
* All cards are dealt, and each starting hand now has eight cards. No stock is used, and play begins immediately after dealing with the player after the dealer.
* The scoring changes as follows:

| Round | Total | Type       | Count | Cost |
|:-----:|:-----:|------------|:-----:|:----:|
| 1     |  -16  | All Tricks |    8  |  -2  |
| 2     |  -16  | Hearts     |    8  |  -2  |
| 3     |  -16  | Lads       |    4  |  -4  |
| 4     |  -16  | Ladies     |    4  |  -4  |
| 5     |  -16  | Last Two   |    2  |  -8  |
| 6     |  -16  | Kinga      |    1  |  -16 |
|-------|-------|------------|-------|------|
| 7     |  -96  | ALL RULES  |       |      |
| 8     | +192  | ALL RULES  |       |      |

