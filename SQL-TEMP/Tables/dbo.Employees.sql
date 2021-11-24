CREATE TABLE [dbo].[Employees]
(
[EmployeeID] [int] NOT NULL IDENTITY(1, 1),
[FirstName] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[MiddleName] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
[LastName] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[DateofBirth] [date] NOT NULL,
[SIN] [char] (9) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[DefaultDepartmentID] [int] NOT NULL,
[CurrentDepartmentID] [int] NOT NULL,
[ReportsToEmployeeID] [int] NULL,
[StreetAddress] [nvarchar] (60) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
[City] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
[Province] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
[PostalCode] [char] (6) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
[StartDate] [date] NOT NULL,
[BaseSalary] [decimal] (18, 2) NOT NULL CONSTRAINT [DF_Employees_BaseSalary] DEFAULT ((0))
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Employees] ADD CONSTRAINT [CK_Employees_DOB] CHECK (([DateofBirth]<=getdate()))
GO
ALTER TABLE [dbo].[Employees] ADD CONSTRAINT [CK_Employees_StartDate] CHECK (([StartDate]<=getdate()))
GO
ALTER TABLE [dbo].[Employees] ADD CONSTRAINT [PK_Employee] PRIMARY KEY CLUSTERED ([EmployeeID]) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_Employees_City_PostalCode] ON [dbo].[Employees] ([City], [PostalCode]) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_Employees_Department_Current] ON [dbo].[Employees] ([CurrentDepartmentID]) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_Employees_Department_Default] ON [dbo].[Employees] ([DefaultDepartmentID]) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_Employees_PostalCode] ON [dbo].[Employees] ([PostalCode]) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_Employees_ReportsToEmployee] ON [dbo].[Employees] ([ReportsToEmployeeID]) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Employees] ADD CONSTRAINT [AK_Employees_SIN] UNIQUE NONCLUSTERED ([SIN]) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Employees] ADD CONSTRAINT [FK_Employees_Departments_Current] FOREIGN KEY ([CurrentDepartmentID]) REFERENCES [dbo].[Departments] ([DepartmentID])
GO
ALTER TABLE [dbo].[Employees] ADD CONSTRAINT [FK_Employees_Departments_Default] FOREIGN KEY ([DefaultDepartmentID]) REFERENCES [dbo].[Departments] ([DepartmentID])
GO
ALTER TABLE [dbo].[Employees] ADD CONSTRAINT [FK_Employees_ReportsTo] FOREIGN KEY ([ReportsToEmployeeID]) REFERENCES [dbo].[Employees] ([EmployeeID])
GO
