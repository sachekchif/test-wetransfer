import React, { Suspense, lazy } from "react";
import Footer from "./components/Footer";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Loader from "./components/Loader/index";

const CompleteSavingsPage = lazy(
  () => import("./pages/CorporateCurrentAccount")
);
const AccountOpenSuccessPage = lazy(
  () => import("./pages/AccountOpenSuccessPage")
);

function App() {
  return (
    <div className="hero-anime font-poppins">
      <Router>
        <Switch>
          <Suspense fallback={<Loader />}>
            <Route
              path="/CorporateAccountOpening"
              exact
              component={CompleteSavingsPage}
            />

            <Route
              path="/CorporateAccountOpening/savings_success"
              exact
              component={AccountOpenSuccessPage}
            />
          </Suspense>
        </Switch>
          <Footer />
      </Router>
    </div>
  );
}

export default App;
