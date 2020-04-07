const path = require("path");
const express = require("express");
const xss = require("xss");
const FoldersServices = require("./folders-services");

const foldersRouter = express.Router();
const jsonParser = express.json();

const serializefolder = (folder) => ({
  id: folder.id,
  folder_name: xss(folder.folder_name),
});

foldersRouter
  .route("/")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");
    FoldersServices.getAllFolders(knexInstance)
      .then((folders) => {
        res.json(folders.map(serializefolder));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { folder_name } = req.body;
    const newFolder = { folder_name };

    for (const [key, value] of Object.entries(newFolder))
      if (value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` },
        });
    newFolder.folder_name = folder_name;
    FoldersServices.insertFolder(req.app.get("db"), newFolder)
      .then((folder_name) => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${folder_name.id}`))
          .json(serializefolder(folder_name));
      })
      .catch(next);
  });

foldersRouter
  .route("/:folder_id")
  .all((req, res, next) => {
    FoldersServices.getById(req.app.get("db"), req.params.folder_id)
      .then((folder) => {
        if (!folder) {
          return res.status(404).json({
            error: { message: `folder doesn't exist` },
          });
        }
        res.folder = folder;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializefolder(res.folder));
  })
  .delete((req, res, next) => {
    FoldersServices.deleteFolder(req.app.get("db"), req.params.folder_id)
      .then((numRowsAffected) => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { folder_name, id } = req.body;
    const folderToUpdate = { folder_name, id };

    const numberOfValues = Object.values(folderToUpdate).filter(Boolean).length;
    if (numberOfValues === 0)
      return res.status(400).json({
        error: {
          message: `Request body must contain 'folder_name'`,
        },
      });

    FoldersServices.updateFolder(
      req.app.get("db"),
      req.params.folder_id,
      folderToUpdate
    )
      .then((numRowsAffected) => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = foldersRouter;
