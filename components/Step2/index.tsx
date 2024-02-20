import React, { SyntheticEvent, useRef, useState, useEffect } from "react";
import { useStateMachine } from "little-state-machine";
import {
  handleNext,
  handlePrevious,
  useValidateBvnMutation,
  useValidateOtpMutation,
  openShow,
  closeShow,
} from "../../services/Mutations/apis";
import { useDispatch } from "react-redux";
import Button from "./../Button/index";
import Loader from "../Loader";
import {
  useGetLgtQuery,
  useGetStatesQuery,
} from "../../services/Queries/dropDowns";
import {
  validateFileSize,
  FileService,
  validateFileType,
} from "../../utils/validator";
import imageToBase64 from "image-to-base64/browser";
import {
  convertDateToNum,
  convertKeysToLowercase,
  decR,
  encR,
  getBase64,
  updateName,
} from "./../../utils/utilities";
import Modal from "../Modal";

export default function Step2() {
  const dispatch = useDispatch();
  const { state, actions } = useStateMachine({ updateName });
  const [bvnResponse, setBvnResponse] = useState("");
  const { data: states } = useGetStatesQuery("");
  const [bvnError, setBvnError] = useState("");
  const [bvn, setBvn] = useState("");
  const [images, setImages] = useState<any>();
  const [fileType, setFileType] = useState<any>();
  const [fileUrl, setFileUrl] = useState<any>();
  const [doc, setDoc] = useState<any>();
  const [bvnResult, setBvnResult] = useState<any>();
  const [uploadDocError, setUploadDocError] = useState("");
  const [isSuccess, setIsSucccess] = useState(false)
  const [
    validateBvn,
    { data: response, isError, isLoading, error },
  ] = useValidateBvnMutation();

  // console.log("RESPONSE", response)
  useEffect(() => {
    if (response !== undefined) {
      // console.log("DEC",decR(response.Data))

      //* DECRYPT RESPONSE FROM BVN ENDPOINT
      const decryptedResponse = JSON.parse(decR(response.data));
      console.log("BVN", decryptedResponse)
      const processedResponse = convertKeysToLowercase(decryptedResponse);

      if(processedResponse.responseCode =="01") {
        setIsSucccess(false)
      }else{
        setIsSucccess(true)
        setBvnResult(processedResponse);
      }

    }
  }, [response]);

  const { data: localGovts } = useGetLgtQuery("");

  //Input refs for emptying the file input after submission
  const idCardRef = useRef() as React.MutableRefObject<HTMLInputElement>;
  const signatureRef = useRef() as React.MutableRefObject<HTMLInputElement>;
  const passportRef = useRef() as React.MutableRefObject<HTMLInputElement>;

  const genders = [
    { value: "1", text: "male" },
    { value: "2", text: "female" },
  ];

  //Mapping out keys value for visuals on the interface
  const gender = genders.find(
    (gender) => gender.text === bvnResult?.gender.toLowerCase()
  )?.value;
  const lgt = localGovts?.find(
    (lgt: any) => lgt.text === bvnResult?.lgaOfOrigin
  )?.value;
  const userState = states?.find(
    (s: any) =>
      s.text.substring(0, 4).toUpperCase() ===
      bvnResult?.stateOfOrigin.substring(0, 4).toUpperCase()
  )?.value;

  // Bvn change handler
  const handleBvnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const bvn = Math.max(0, parseInt(e.target.value)).toString().slice(0, 12);
    setBvn(bvn);
    setBvnError("");
    if (bvn.length === 11) {
      //* ENCRYPT BVN BEFORE SENDING TO API

      const Data = encR(JSON.stringify({ bvn: bvn }));

      validateBvn(Data);
      // validateBvn(bvn);
    }
  };

  // File handler
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files;
    const name = e.target.name;

    if (!file) {
      return setUploadDocError("An image is required");
    }
    const validFileSize = await validateFileSize(file[0]?.size);

    const validFileType = await validateFileType(
      FileService.getFileExtension(file[0]?.name)
    );

    if (!validFileSize.isValid) {
      setUploadDocError(validFileSize.errorMessage);
      return;
    }

    if (!validFileType.isValid) {
      setUploadDocError(validFileType.errorMessage);
      return;
    }

    const imageUrl = URL.createObjectURL(file[0]);
    setFileUrl((prev: any) => ({ ...prev, [name]: imageUrl }));
    setFileType((prev: any) => ({ ...prev, [name]: file }));

    getBase64(file).then((response) => {
      setImages((prev: any) => ({ ...prev, [name]: response }));
    });
    setUploadDocError("");
  };

  const addDirectorDetails = () => {
    const details = state.data.directorDetails.map(
      (details) => details.directorBVN
    );

    if (bvn.length !== 11) {
      return setBvnError("Please enter a valid bvn to continue");
    }
    if (!images) {
      return setUploadDocError(
        "You need to upload the following documents to continue"
      );
    }
    if (!images.signature) {
      return setUploadDocError("Signature is required");
    }
    if (!images.passport) {
      return setUploadDocError("Passport is required");
    }
    if (!images.idCard) {
      return setUploadDocError("IdCard is required");
    }
    if (state.data.directorDetails.includes(bvn)) {
    }
    if (details.includes(bvn)) {
      return setBvnError("You can not upload the same bvn twice");
    }
    if (uploadDocError) {
      return;
    }
    if (error) {
      return;
    }

    const newDirector = {
      directorBVN: bvnResult?.bvn,
      directorName: `${bvnResult?.firstName} ${bvnResult?.lastName}`,
      gender,
      religion: "1 Christianity",
      dateofBirth: convertDateToNum(bvnResult?.dateOfBirth),
      address: bvnResult?.residentialAddress,
      countryofOrigin: bvnResult?.nationality,
      stateofOrigin: userState + " " + bvnResult?.stateOfOrigin,
      localGovernment: lgt ? lgt + " " + bvnResult?.lgaOfOrigin : "2508",
      relationship: bvnResult?.relationship,
      signature: images.signature,
      idCard: images.idCard,
      passportPhotoGraph: images.passport,
      passportPhotoGraphExt: fileType?.passport[0].type,
      idCardExt: fileType?.idCard[0].type,
      signatureExt: fileType?.signature[0].type,
    };

    const newDetails = {
      directorName: newDirector.directorName,
      mobileNumber: bvnResult?.phoneNumber1,
      emailAddress: bvnResult?.email ? bvnResult?.email : "No Email from Bvn",
      directorBVN: bvnResult?.bvn,
      dateofBirth: bvnResult?.dateOfBirth,
      address: bvnResult?.residentialAddress,
      countryofOrigin: bvnResult?.nationality,
      stateofOrigin: userState,
      gender,
      religion: "1 Christianity",
      signature: fileUrl.signature,
      idCard: fileUrl.idCard,
      passport: fileUrl.passport,
    };

    const directorsArray = state.data.directorDetails;
    const detailsArray = state.data.detailsArray;
    actions.updateName({
      ...state.data,
      directorDetails: [...directorsArray, newDirector],
      detailsArray: [...detailsArray, newDetails],
    });

    setImages("");
    setBvn("");
    setDoc("");

    idCardRef.current.value = "";
    passportRef.current.value = "";
    signatureRef.current.value = "";
  };

  const deleteDetail = (directorBvn: any) => {
    const directorDetail = state.data.directorDetails.filter(
      (item) => item.directorBVN !== directorBvn
    );

    const detailArray = state.data.detailsArray.filter(
      (item) => item.directorBVN !== directorBvn
    );

    actions.updateName({
      ...state.data,
      directorDetails: [...directorDetail],
      detailsArray: [...detailArray],
    });
  };

  const confirmAndContinue = () => {
    if (state.data.directorDetails.length === 0) {
      return setUploadDocError(
        "You need to upload the required documents to continue"
      );
    }
    if (uploadDocError) {
      return;
    }
    dispatch(handleNext());
  };

  return (
    <div className="tab-content" id="myTabContent">
      <div className="tab-pane fade show active nib_cor_instant_tab d-flex justify-content-center">
        <div className="col-lg-8 m-t-20">
          <div className="row">
            {/* <!-- PERSONAL DETAILS --> */}
            <div className="col-lg-12">
              <div className="panel panel-default">
                <div className="panel-heading text-center bg-gray white-text text-white font-weight-900">
                  DIRECTORS INFORMATION
                </div>
                <div className="panel-body">
                  <div className="user_bvn_data_row1 font-12 m-b-20">
                    <div className="col-lg-12">
                      <div className="row">
                        <h5
                          style={{
                            textDecoration: "underline",
                            marginBottom: "30px",
                          }}
                        >
                          DIRECTORS DETAILS
                        </h5>
                        <div className="form-group col-lg-12 col-md-6 col-sm-12 font-weight-700 m-b-20">
                          <label>BVN</label>
                          {bvnError && (
                            <span className="pl-2 text-center text-danger">
                              {bvnError}
                            </span>
                          )}
                          <input
                            type="number"
                            onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                              (e.target.value = e.target.value.slice(0, 11))
                            }
                            onChange={handleBvnChange}
                            className="form-control col-lg-12 col-md-6 col-sm-12  m-b-10"
                            name="bvn"
                            placeholder="Enter Directors BVN"
                            value={bvn}
                          />
                        </div>

                        <div className="form-group col-lg-12 col-md-6 col-sm-12 font-weight-700 m-b-20 text-center">
                          {isLoading && (
                            <span className="d-flex justify-content-center">
                              <Loader />
                            </span>
                          )}

                          {isSuccess ? (
                            <span
                              style={{ color: "green" }}
                              className="text-center"
                            >
                              Your Bvn is valid, please upload the images to
                              continue
                            </span>
                          ) : (
                            ""
                          )}

                          {error && (
                            <span className="text-center text-danger">
                              Invalid Bvn, Please enter a valid Bvn to continue
                            </span>
                          )}
                        </div>

                        <div className="form-group col-lg-12 col-md-6 col-sm-12 font-weight-700 m-b-20 text-center">
                          {uploadDocError && (
                            <span className="text-danger">
                              {uploadDocError}
                            </span>
                          )}
                        </div>
                        <div className="form-group col-lg-4 col-md-6 col-sm-12 font-weight-700 m-b-20">
                          <label>UPLOAD YOUR SIGNATURE</label>
                          <div className="border py-1 pl-2">
                            <input
                              ref={signatureRef}
                              type="file"
                              accept=".doc,.docx,.pdf..jpeg,.png,.PNG,.jpg"
                              onChange={handleFile}
                              name="signature"
                            />
                          </div>
                        </div>

                        <div className="form-group col-lg-4 col-md-6 col-sm-12 font-weight-700 m-b-20">
                          <label>UPLOAD VALID ID CARD</label>
                          <div className="border py-1 pl-2">
                            <input
                              ref={idCardRef}
                              type="file"
                              accept=".doc,.docx,.pdf..jpeg,.png,.PNG,.jpg"
                              onChange={handleFile}
                              name="idCard"
                            />
                          </div>
                        </div>

                        <div className="form-group col-lg-4 col-md-6 col-sm-12 font-weight-700 m-b-20">
                          <label>UPLOAD PASSPORT PHOTOGRAPH</label>
                          <div className="border py-1 pl-2">
                            <input
                              ref={passportRef}
                              type="file"
                              accept=".doc,.docx,.pdf..jpeg,.png,.PNG,.jpg"
                              onChange={handleFile}
                              name="passport"
                            />
                          </div>
                        </div>

                        <div className="form-group col-lg-12 font-weight-700 m-b-30 d-flex">
                          <Button
                            className="btn btn-suntrust col-5"
                            child="ADD"
                            type="button"
                            onClick={addDirectorDetails}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-group col-lg-12 col-md-12 col-sm-12">
                    <div className="header font-weight-700">
                      <h6>DIRECTORS DETAILS</h6>
                    </div>
                    <div className="table-responsive border font-14">
                      <table className="table table-hover mb-0 c_list">
                        <thead style={{ backgroundColor: "#c4c4c4" }}>
                          <tr>
                            <th>S/N</th>
                            <th>DIRECTOR NAME</th>
                            <th>PHONE NUMBER</th>
                            <th>EMAIL</th>
                            <th>ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.data.detailsArray.map((detail, index) => {
                            const {
                              directorBVN,
                              emailAddress,
                              directorName,
                              mobileNumber,
                            } = detail;
                            return (
                              <>
                                <tr key={index}>
                                  <td>{index + 1}</td>
                                  <td>{directorName}</td>
                                  <td>{mobileNumber}</td>
                                  <td>{emailAddress}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-suntrust btn-sm m-b-5 mr-2"
                                      title="view"
                                      onClick={() =>
                                        dispatch(openShow(directorBVN))
                                      }
                                    >
                                      View
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-sm m-b-5"
                                      title="Delete"
                                      onClick={() => deleteDetail(directorBVN)}
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                                <Modal />
                              </>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-group col-lg-12 col-md-12 col-sm-12 m-b-20">
            <div className="d-sm-block d-md-flex m-t-20">
              <Button
                child="PREVIOUS PAGE"
                className="btn btn-block btn-suntrust font-weight-900"
                onClick={() => dispatch(handlePrevious())}
                type="button"
              />

              <Button
                child="NEXT PAGE"
                className="btn btn-block btn-suntrust font-weight-900"
                onClick={confirmAndContinue}
                type="button"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
