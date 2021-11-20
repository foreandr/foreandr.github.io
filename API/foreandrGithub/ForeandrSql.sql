/* CREATE TABLE BLOGPOSTS */
USE [foreandr.github.io.DATABASE];
GO
CREATE TABLE dbo.Writers(
ID INT NOT NULL IDENTITY(1, 1) PRIMARY KEY,
FirstName NVARCHAR (50),
LastName NVARCHAR (50), 
DateOfBIrth DATE,
Country NVARCHAR(80),
);
/* DROP TABLE dbo.Writers */
DROP TABLE dbo.Writers;

/* CREATE TABLE BLOGPOSTS */
USE [foreandr.github.io.DATABASE];
GO
CREATE TABLE dbo.BlogPosts(
ID INT NOT NULL IDENTITY(1, 1),
WriterID INT FOREIGN KEY (WriterID) REFERENCES dbo.Writers(ID),
Title NVARCHAR (50),
UploadDate DATE,
Contents NVARCHAR (4000), 
);