export const PAGES=[
 {t:"The goal",img:"ex_board",cap:"A landscape built together",html:`
  <p>Together you build a landscape of castles, paths, monasteries and fields, one tile at a time.</p>
  <p>Place your followers on castles, paths, monasteries and fields to score points.</p>
  <p>When the last tile has been placed, the player with the most points wins. If it's a tie, you share the victory.</p>
  <h3>Getting started</h3>
  <ul><li>The game begins with one tile in the middle: a castle with a path running past it.</li>
  <li>Each player has 7 followers.</li>
  <li>The numbers that pop up under your names decide who goes first. The highest number starts.</li></ul>`},
 {t:"Your turn",icons:[["i_rotate","Rotate"],["i_undo","Undo"],["i_follower","Follower"],["i_end_turn","Timer"]],cap:"Place, claim, score",html:`
  <h3>1. Place a tile</h3>
  <p>You get a new tile automatically. Place it next to a tile on the board so that everything continues: castle meets castle, path meets path, field meets field.</p>
  <p>Glowing spots show where it fits. Tap a spot, rotate the tile if you want, then confirm. If your tile fits nowhere, it's removed and you get a new one.</p>
  <h3>2. Place a follower (optional)</h3>
  <p>You may place one follower on the tile you just placed: on its castle, path, monastery or one of its fields. Markers show where it's allowed. Tap a marker to place it; tap it again to take it back.</p>
  <ul><li>You can't place a follower on a castle, path or field that already has a follower anywhere along it.</li>
  <li>If you have no followers left, skip this step.</li></ul>
  <h3>3. Scoring</h3>
  <p>When you end your turn, everything your tile finished is scored, even if it finishes something of your opponent's. Followers on a scored castle, path or monastery return to their owners.</p>`},
 {t:"Paths",img:"ex_path",cap:"Finished: 3 tiles = 3 points",html:`
  <p><b>Finished:</b> when both ends stop. A path stops at a crossing, a castle or a monastery, or when it loops back on itself.</p>
  <p><b>Points:</b> 1 point for every tile the path runs through.</p>`},
 {t:"Castles",img:"ex_castle",cap:"Finished: 2 tiles = 4 points",html:`
  <p><b>Finished:</b> when the castle is completely surrounded by walls, with no gaps.</p>
  <p><b>Points:</b> 2 points for every tile in the castle, plus 2 points for every shield.</p>`},
 {t:"The cathedral",img:"ex_cathedral",cap:"Worth more, but riskier",html:`
  <p>A castle with the cathedral in it is worth more, but it's a gamble.</p>
  <p><b>Finished:</b> 3 points for every tile and 3 points for every shield.</p>
  <p><b>Not finished at the end of the game:</b> 0 points.</p>`},
 {t:"Monasteries",img:"ex_monastery",cap:"Surrounded: 9 points",html:`
  <p><b>Finished:</b> when all 8 tiles around the monastery have been placed.</p>
  <p><b>Points:</b> 9 points: 1 for the monastery and 1 for each tile around it.</p>`},
 {t:"Fields and farmers",img:"ex_field",cap:"2 finished castles touch this field = 6 points",html:`
  <ul><li>A follower on a field is a farmer. It lies down to show it's working the land.</li>
  <li>A field is all the connected grass, cut off by paths, castle walls and the edge of the board.</li>
  <li>Farmers stay on the board for the whole game. They never come back, so place them wisely.</li>
  <li>At the end of the game, each field scores 3 points for every finished castle that touches it. The same castle can count for more than one field.</li></ul>`},
 {t:"Sharing",img:"ex_share",cap:"Blue has more followers on this path",html:`
  <p>You can't place a follower on a castle, path or field that's already taken. But you can place one on a separate piece nearby and connect it later.</p>
  <p>If a castle, path or field ends up with followers from both of you:</p>
  <ul><li>The player with the most followers on it gets all the points.</li>
  <li>If it's a tie, you both get all the points.</li></ul>
  <p>So you can steal a castle by connecting to it with more followers.</p>`},
 {t:"Turn timer",icons:[["i_end_turn","30 sec, 1 min, 5 min"]],cap:"Chosen when starting a game",html:`
  <p>If you chose a turn timer when starting the game and your time runs out:</p>
  <ul><li>your tile is placed in a random spot where it fits,</li>
  <li>no follower is placed,</li>
  <li>and it becomes the other player's turn.</li></ul>`},
 {t:"End of the game",icons:[["i_crown","Winner"]],cap:"Highest score wins",html:`
  <p>The game ends right after the last tile is placed. Then everything still on the board is scored:</p>
  <ul><li><b>Unfinished path:</b> 1 point per tile.</li>
  <li><b>Unfinished castle:</b> 1 point per tile and 1 point per shield.</li>
  <li><b>Unfinished castle with the cathedral:</b> 0 points.</li>
  <li><b>Unfinished monastery:</b> 1 point plus 1 point for each tile around it.</li>
  <li><b>Fields:</b> 3 points for every finished castle touching the field, for the player with the most farmers on it.</li></ul>
  <p>The highest score wins. If it's a tie, you share the victory.</p>`},
];
