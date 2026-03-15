// eslint-disable eslint-plugin-unicorn(no-empty-file)
/**
 * @swagger
 * /echo:
 *   get:
 *     tags: [Engine]
 *     description: Engine Echo
 *     responses:
 *       200:
 *         description: Engine Echo response
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *
 * @swagger
 * /slave/build/initialize:
 *   post:
 *     tags: [Engine]
 *     description: Initialize a new build
 *     parameters:
 *       - in: query
 *         name: pid
 *         schema:
 *           type: string
 *         required: true
 *         description: Project ID
 *       - in: query
 *         name: buildVersion
 *         schema:
 *           type: string
 *         required: false
 *         description: Build version
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *         required: true
 *         description: Project API Key
 *     responses:
 *       200:
 *         description: Build initialized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pid:
 *                   type: string
 *                 bid:
 *                   type: string
 *                 buildIndex:
 *                   type: integer
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *
 * /slave/images/project-tests/{pid}:
 *   post:
 *     tags: [Engine]
 *     description: Upload a test image
 *     parameters:
 *       - in: path
 *         name: pid
 *         schema:
 *           type: string
 *         required: true
 *         description: Project ID
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *         required: true
 *         description: Project API Key
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 receivedImages:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *
 * /slave/build/sync:
 *   post:
 *     tags: [Engine]
 *     description: Sync build and upload images
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *         required: true
 *         description: Project API Key
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               pid:
 *                 type: string
 *               buildVersion:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Sync complete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pid:
 *                   type: string
 *                 bid:
 *                   type: string
 *                 buildIndex:
 *                   type: integer
 *                 status:
 *                   type: string
 *                 result:
 *                   type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
