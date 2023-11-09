import express, { Request, Response } from 'express';
let app = express();
app.get('/', function (req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/json');
  res.send('{msg: "Hello World!"}');
});
app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});