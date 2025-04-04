"use client";

import { redirect, useRouter } from "next/navigation";
import { useState, useRef } from "react";
import Papa from "papaparse";
import CheckBox from "@/components/CheckBox";

export default function Home() {
  const [files, setFiles] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState("");
  const fileInputRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [checkedItems, setCheckedItems] = useState([]);
  
  const extractLogOptions = (file) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = (event) => {
      const csvText = event.target.result;

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const data = result.data;
          if (data.length ===  0 || !data[0].Collar) {
            alert("Invalid CSV file format");
            return;
          }

          // Group collars
          let group = 0;
          let lastCollar = null;
          const groups = {};

          data.forEach((row) => {
            if (row.Collar !== lastCollar) {
              group++;
            }
            lastCollar = row.Collar;
            if (!groups[group]) {
              groups[group] = [];
            }
            //console.log(row.Sample_Mass > 0);
            
            groups[group].push(row);
          });

          // Filter groups where the first row's sample mass > 0
          const filteredGroups = Object.values(groups).filter(
            (group) => parseFloat(group[0].Sample_Mass) > 0
          );

          // Extract first 'Collar' from each group
          //const logOptionsList = Object.values(groups).map((group) => group[0].Collar);
          const logOptionsList = filteredGroups.map((group) => group[0].Collar)
          setLogs(logOptionsList);
        },
      });
    };
  };

  const handleCheckboxChange = (log) => {
    setCheckedItems((prevLogs) =>
      prevLogs.includes(log)
        ? prevLogs.filter((item) => item !== log) // Remove if unchecked
        : [...prevLogs, log] // Add if checked
    );
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);

    if (selectedFiles.length > 0) {
      extractLogOptions(selectedFiles[0]);
    }
};


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files) {
      alert("Please select the files!");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    })

    checkedItems.forEach((log) => {
      formData.append("checkedItems", log);
    });

    console.log([...formData]);
    

    try {
      const response = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload files");
      }

      // Create a Blob URL for the downloaded file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);

      // Clear the file input after report is processed
      setFiles([]);
      setCheckedItems([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset the input field
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }

  };

  const handleDownload = () => {
    setDownloadUrl("");
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-y-10 min-h-screen justify-center items-center mx-auto">
     
      <h1 className="m-4 text-xl font-bold">Upload Files for Analysis</h1>
      <form encType="multipart/form-data" onSubmit={handleSubmit}>
        <input className="hover:cursor-pointer" type="file" onChange={handleFileChange} ref={fileInputRef} name="files" multiple />
        <button
          type="submit"
          className="bg-slate-500 text-white p-5 rounded-md hover:cursor-pointer"
        >
          Upload and Process
        </button>
      </form>
      {downloadUrl && (
        <div className="text-xl font-thin">
          <h2>Download your processed report:</h2>
          <a
            className="hover:underline hover:text-blue-500"
            href={downloadUrl}
            download="report.html"
            onClick={handleDownload}
          >
            Download Report
          </a>
        </div>
      )}

      <div className="p-10">
              {logs.length > 0 && (
                <>
                <h2 className="text-lg">Please select the logs you want:</h2>
                {logs.map((log) => (
                  <div key={log} className="flex gap-x-3 items-center">
                    <h1>{log}</h1>
                    <CheckBox log={log} checkedItems={checkedItems} handleCheckBoxChange={() => handleCheckboxChange(log)} />
                  </div>
                ))}
                </>
              )
                }
      </div>
    </div>
  );
}
