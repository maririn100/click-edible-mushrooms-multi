function main() {
	const scene = new g.Scene({
		game: g.game,
		assetIds: ["edibleMushroom"] // akashic scan assetした画像ID
	});

	scene.onLoad.add(() => {
		// スコア表示用
		let score = 0;
		const scoreLabel = new g.Label({
			scene: scene,
			text: "SCORE: 0",
			font: new g.DynamicFont({ game: g.game, fontFamily: "sans-serif", size: 32 }),
			fontSize: 32,
			textColor: "black",
			x: 100,
			y: 10
		});
		scene.append(scoreLabel);

		// キノコを生成する関数
		const createMushroom = () => {
			const mushroom = new g.Sprite({
				scene: scene,
				src: scene.asset.getImageById("edibleMushroom"),
				x: g.game.random.generate() * (g.game.width - 64), // 画面内にランダム配置
				y: g.game.random.generate() * (g.game.height - 64),
				touchable: true
			});

			// クリックされた時の処理
			mushroom.onPointDown.add(() => {
				// まだシーンに存在していれば（二重クリック防止）
				if (mushroom.parent) {
					mushroom.destroy();
					score += 10;
					scoreLabel.text = `SCORE: ${score}`;
					scoreLabel.invalidate(); // 表示を更新
				}
			});

			scene.append(mushroom);

			// 3秒経ったら自動で消える（早い者勝ち感を出すため）
			scene.setTimeout(() => {
				if (mushroom.parent) mushroom.destroy();
			}, 3000);
		};

		// 1秒ごとにキノコを生成するタイマー
		scene.setInterval(() => {
			createMushroom();
		}, 1000);
	});

	g.game.pushScene(scene);
}

export = main;
