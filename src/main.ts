function main() {
	const scene = new g.Scene({
		game: g.game,
		assetIds: ["edibleMushroom"]
	});

	// 生成されたキノコを管理するマップ（辞書）
	const mushroomMap: { [key: number]: g.E } = {};

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

		// --- メッセージ受信処理 ---
		scene.onMessage.add(ev => {
			const data: any = ev.data;
			if (data && data.type === "hit") {
				// 自作のマップからキノコを取り出す
				const target = mushroomMap[data.mushroomId];

				if (target && !target.destroyed()) {
					target.destroy();
					// マップからも削除
					delete mushroomMap[data.mushroomId];

					score += 10;
					scoreLabel.text = `SCORE: ${score}`;
					scoreLabel.invalidate();
				}
			}
		});

		// --- キノコ生成関数 ---
		const createMushroom = () => {
			const mushroom = new g.Sprite({
				scene: scene,
				src: scene.asset.getImageById("edibleMushroom"),
				x: g.game.random.generate() * (g.game.width - 64),
				y: g.game.random.generate() * (g.game.height - 64),
				touchable: true
			});

			// 生成したキノコをマップに登録
			mushroomMap[mushroom.id] = mushroom;

			mushroom.onPointDown.add(() => {
				g.game.raiseEvent(new g.MessageEvent({
					type: "hit",
					mushroomId: mushroom.id
				}));
			});

			scene.append(mushroom);

			// 3秒経ったら自動で消える
			scene.setTimeout(() => {
				if (!mushroom.destroyed()) {
					mushroom.destroy();
					delete mushroomMap[mushroom.id]; // 消えたらマップからも消す
				}
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
