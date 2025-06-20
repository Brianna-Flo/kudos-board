const express = require("express");
const router = express.Router();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { checkCardInBoard } = require("../utils/utils");
const commentRoutes = require("./commentRoutes");
router.use("/:boardId/cards", commentRoutes);

// get all cards for a given board
router.get("/:boardId/cards", async (req, res) => {
  const boardId = parseInt(req.params.boardId);
  try {
    const cards = await prisma.card.findMany({
      orderBy: [{pinned: 'desc'}],
      include: { comments: true },
      where: { boardId: boardId }, // returns all cards whos boardId is boardId
    });
    res.json(cards);
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

router.get("/:boardId/cards/:cardId", async (req, res) => {
  const boardId = parseInt(req.params.boardId);
  const cardId = parseInt(req.params.cardId);
  try {
    const card = await checkCardInBoard(cardId, boardId);
    if (card) {
      res.json(card);
    } else {
      res.status(404).send(`Card ${cardId} not found in board ${boardId}`);
    }
  } catch (error) {
    res.status(500).send("An error occurred while fetching the card");
  }
});

// create a card that is mapped to a board
router.post("/:boardId/cards/", async (req, res) => {
  if (!req.body.cardTitle || !req.body.cardDescription) {
    return res.status(400).send("title and description is required");
  }
  const boardId = parseInt(req.params.boardId);
  const { cardTitle, cardDescription, gifURL, cardUpvotes, cardAuthor, pinned } =
    req.body;

  try {
    const newCard = await prisma.Card.create({
      data: {
        cardTitle,
        cardDescription,
        gifURL,
        cardUpvotes,
        cardAuthor,
        pinned,
        board: { connect: { id: boardId } },
      },
    });
    res.json(newCard);
  } catch (error) {
    res.status(500).send("An error occurred while creating the card");
  }
});

router.put("/:boardId/cards/:cardId", async (req, res) => {
  if (!req.body.cardTitle || !req.body.cardDescription) {
    return res.status(400).send("title and description is required");
  }
  const boardId = parseInt(req.params.boardId);
  const cardId = parseInt(req.params.cardId);
  const { cardTitle, cardDescription, gifURL, cardUpvotes, cardAuthor, pinned } =
    req.body;
  try {
    const inBoard = await checkCardInBoard(cardId, boardId);
    if (!inBoard) {
      return res
        .status(404)
        .send(`Card ${cardId} not found in board ${boardId}`);
    }

    let newOrder = 1;
    if (pinned) {
        const order = await prisma.Card.findFirst({
            orderBy: {orderPinned: 'desc'},
            where: {boardId: boardId,
                pinned: true
            },
            select: {orderPinned: true}
        })
        newOrder = (order !== null) ? (order.orderPinned + 1) : 1;
    }
    const updatedCard = await prisma.Card.update({
      where: { id: cardId },
      data: {
        cardTitle,
        cardDescription,
        gifURL,
        cardUpvotes,
        cardAuthor,
        pinned,
        orderPinned: pinned ? newOrder : null,
        board: { connect: { id: boardId } },
      },
    });
    res.json(updatedCard);
  } catch (error) {
    res.status(500).send("An error occurred while updating the card");
  }
});

router.delete("/:boardId/cards/:cardId", async (req, res) => {
  const boardId = parseInt(req.params.boardId);
  const cardId = parseInt(req.params.cardId);
  try {
    const inBoard = await checkCardInBoard(cardId, boardId);
    if (!inBoard) {
      return res
        .status(404)
        .send(`Card ${cardId} not found in board ${boardId}`);
    }

    const deletedCard = await prisma.Card.delete({
      where: { boardId: boardId, id: cardId },
    });
    res.json(deletedCard);
  } catch (error) {
    res.status(500).send("An error occurred while deleting the card");
  }
});

module.exports = router;
