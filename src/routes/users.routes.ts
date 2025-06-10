import { Router } from 'express';
import type { Request, Response } from 'express';
import { CustomerController } from '../controllers/CustomerController';

const router = Router();

const customercontroller = new CustomerController();

/* GET users listing. */
router.get('/', function (req: Request, res: Response) {
  res.send('respond with a resource');
});

/* get customer info from customer id */
router.get('/:id', function (req: Request, res: Response) {
  customercontroller.getCustomer(req, res);
});

router.put('/:id', function (req: Request, res: Response) {
  customercontroller.updateCustomer(req, res);
});

export { router as UserRoutes };
