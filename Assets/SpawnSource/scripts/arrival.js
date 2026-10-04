// The world's doorway. A fresh visit opens the main menu; a player who just picked a lobby from it
// (state.joining, set before the cross) lands straight in play. The first visit also stops on the
// tutorial (state.sawTutorial lives on the player's save, so M does not show it again).
export function onArrive(ctx, player) {
  if (player.state.joining) {
    player.state.joining = false;
    player.state.menu = false;
    player.state.tutorial = false;
  } else {
    player.state.menu = true;
    player.state.tutorial = !player.state.sawTutorial;
  }
}

export function onLeave(ctx, player) {}
